using Microsoft.AspNetCore.SignalR;
using BE.Models.QuizHub;
using BE.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;
using BE.Dtos.QuizHub;

namespace BE.Services.QuizHub
{
    public class LiveQuizManager
    {
        private readonly IHubContext<QuizHub> _hubContext;
        private readonly IServiceScopeFactory _scopeFactory;

        private readonly ConcurrentDictionary<string, QuizState> _activeQuizzes = new();

        public LiveQuizManager(IHubContext<QuizHub> hubContext, IServiceScopeFactory scopeFactory)
        {
            _hubContext = hubContext;
            _scopeFactory = scopeFactory;
        }

        public async Task StartQuizAsync(string roomCode)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppContext>();

            var room = await context.LiveQuizRooms.FirstOrDefaultAsync(r => r.RoomCode == roomCode);
            if (room == null)
            {
                Console.WriteLine($"[StartQuizAsync] Soba {roomCode} nije pronađena.");
                return;
            }

            if (room.IsQuizStarted)
            {
                Console.WriteLine($"[StartQuizAsync] Kviz za sobu {roomCode} je već aktivan.");
                return;
            }

            // Postavi flag da je kviz startovan i sačuvaj
            room.IsQuizStarted = true;
            await context.SaveChangesAsync();

            if (_activeQuizzes.ContainsKey(roomCode))
            {
                Console.WriteLine($"[StartQuizAsync] Kviz za sobu {roomCode} je već aktivan.");
                return;
            }

            _ = RunQuizSessionAsync(roomCode);
        }


        private async Task RunQuizSessionAsync(string roomCode)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppContext>();

            Console.WriteLine($"[RunQuizSessionAsync] Pokrećem kviz za sobu {roomCode}.");

            var room = await context.LiveQuizRooms
                .Include(r => r.Participants)
                .ThenInclude(p => p.User)
                .FirstOrDefaultAsync(r => r.RoomCode == roomCode);

            if (room == null)
            {
                Console.WriteLine($"[RunQuizSessionAsync] Soba {roomCode} nije pronađena.");
                return;
            }

            var quiz = await context.Quizzes
                .Include(q => q.Questions)
                .ThenInclude(q => q.Options)
                .FirstOrDefaultAsync(q => q.Id == room.QuizId);

            if (quiz == null || quiz.Questions.Count == 0)
            {
                Console.WriteLine($"[RunQuizSessionAsync] Kviz za sobu {roomCode} nije pronađen ili nema pitanja.");
                return;
            }

            var quizState = new QuizState(quiz, room);
            if (!_activeQuizzes.TryAdd(roomCode, quizState))
            {
                Console.WriteLine($"[RunQuizSessionAsync] Nije uspelo dodavanje aktivne sesije za sobu {roomCode}.");
                return;
            }

            foreach (var p in room.Participants)
            {
                p.Score = 0;
                p.CorrectAnswers = 0;
                p.TotalTime = 0;
            }
            await context.SaveChangesAsync();

            await _hubContext.Clients.Group(roomCode).SendAsync("QuizStarted");

            foreach (var question in quiz.Questions.OrderBy(q => q.Id))
            {
                quizState.StartQuestion(question);

                var questionPayload = new
                {
                    question.Id,
                    question.Text,
                    question.Type,
                    question.AllowMultipleAnswers,
                    Options = question.Options.Select(o => new { o.Id, o.Text })
                };

                await _hubContext.Clients.Group(roomCode).SendAsync("ReceiveQuestion", questionPayload);

                int waitTimeMs = quizState.QuestionTimeLimitMs;
                int elapsed = 0;
                int waitSlice = 500;

                while (elapsed < waitTimeMs && !quizState.AllParticipantsAnswered())
                {
                    await Task.Delay(waitSlice);
                    elapsed += waitSlice;
                }

                await context.SaveChangesAsync();

                var updatedLeaderboard = await GetLeaderboardAsync(roomCode, context);
                await _hubContext.Clients.Group(roomCode).SendAsync("UpdateLeaderboard", updatedLeaderboard);

                quizState.ClearCorrectAnswersForQuestion(question.Id);
                quizState.ResetAnswers();
                quizState.BonusAwarded = false;
            }

            await context.SaveChangesAsync();

            var finalLeaderboard = await GetLeaderboardAsync(roomCode, context);
            Console.WriteLine("=== KONAČNI REZULTATI KVIZA ===");
            foreach (var p in finalLeaderboard)
            {
                Console.WriteLine($"🏆 {p.Username} | Ukupno: {p.Score} | Tačnih: {p.CorrectAnswers} | Vreme: {p.TotalTime:F2}s");
            }
            Console.WriteLine("================================");

            await _hubContext.Clients.Group(roomCode).SendAsync("UpdateLeaderboard", finalLeaderboard);
            await _hubContext.Clients.Group(roomCode).SendAsync("QuizEnded");

            _ = Task.Run(async () =>
            {
                Console.WriteLine($"[RunQuizSessionAsync] Čekam 10 sekundi pre uklanjanja sesije za sobu {roomCode}...");
                await Task.Delay(10000);
                _activeQuizzes.TryRemove(roomCode, out _);
                Console.WriteLine($"[RunQuizSessionAsync] Sesija za sobu {roomCode} uklonjena.");
            });
        }

        public async Task SubmitAnswerAsync(
            string roomCode,
            int userId,
            int questionId,
            List<int> selectedOptionIds,
            string? textAnswer,
            int durationMs)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppContext>();

            var room = await context.LiveQuizRooms
                .Include(r => r.Participants)
                .ThenInclude(p => p.User)
                .FirstOrDefaultAsync(r => r.RoomCode == roomCode);

            if (room == null)
            {
                Console.WriteLine($"[SubmitAnswerAsync] Soba {roomCode} nije pronađena u bazi.");
                return;
            }

            var participant = room.Participants.FirstOrDefault(p => p.UserId == userId);
            if (participant == null)
            {
                Console.WriteLine($"[SubmitAnswerAsync] Učesnik userId={userId} nije pronađen u sobi {roomCode}");
                return;
            }

            var question = await context.Questions
                .Include(q => q.Options)
                .FirstOrDefaultAsync(q => q.Id == questionId);

            if (question == null)
            {
                Console.WriteLine($"[SubmitAnswerAsync] Pitanje {questionId} nije pronađeno u bazi");
                return;
            }

            bool isCorrect = false;

            if (question.Type == "single" || question.Type == "multiple" || question.Type == "truefalse")
            {
                if (selectedOptionIds != null && selectedOptionIds.Count > 0)
                {
                    var correctOptionIds = question.Options
                        .Where(o => o.IsCorrect)
                        .Select(o => o.Id)
                        .ToHashSet();

                    var userOptionIds = selectedOptionIds.ToHashSet();

                    isCorrect = correctOptionIds.SetEquals(userOptionIds);
                }
            }
            else if (question.Type == "text")
            {
                if (!string.IsNullOrWhiteSpace(question.CorrectTextAnswer) &&
                    !string.IsNullOrWhiteSpace(textAnswer) &&
                    textAnswer.Trim().ToLower() == question.CorrectTextAnswer.Trim().ToLower())
                {
                    isCorrect = true;
                }
            }

            Console.WriteLine($"[SubmitAnswerAsync] UserId={userId}, QuestionId={questionId}, IsCorrect={isCorrect}");

            bool firstTimeAnswering = true;
            QuizState? quizState = null;
            if (_activeQuizzes.TryGetValue(roomCode, out var qsOuter))
            {
                quizState = qsOuter;
                firstTimeAnswering = quizState.TryMarkUserAnsweredQuestion(userId, questionId);
            }

            if (isCorrect && firstTimeAnswering)
            {
                participant.CorrectAnswers++;
                participant.Score += question.Points;

                Console.WriteLine($"[SubmitAnswerAsync] Trenutni rezultat za {participant.User?.Username} -> Ukupno: {participant.Score}, Tacnih: {participant.CorrectAnswers}, Vreme: {durationMs / 1000:F2}s");

                if (_activeQuizzes.TryGetValue(roomCode, out var activeQs))
                {
                    if (!activeQs.BonusAwarded)
                    {
                        double remainingRatio = Math.Max(0, (activeQs.QuestionTimeLimitMs - durationMs) / (double)activeQs.QuestionTimeLimitMs);
                        int bonus = (int)Math.Round(question.Points * remainingRatio);

                        if (bonus > 0)
                        {
                            participant.Score += bonus;
                            Console.WriteLine($"[BonusAward] {participant.User?.Username} dobija {bonus} bonus poena za pitanje {questionId} (najbrži tačan odgovor).");
                        }

                        activeQs.BonusAwarded = true;
                    }
                }
            }
            else if (!firstTimeAnswering)
            {
                Console.WriteLine($"[SubmitAnswerAsync] Korisnik {userId} je već odgovorio na pitanje {questionId}, ne dodeljujem poene ponovo.");
            }

            participant.TotalTime += durationMs / 1000.0;

            if (quizState != null)
            {
                quizState.MarkAnswered(userId);
            }

            await context.SaveChangesAsync();

            var leaderboard = await GetLeaderboardAsync(roomCode, context);
            await _hubContext.Clients.Group(roomCode).SendAsync("UpdateLeaderboard", leaderboard);

            Console.WriteLine($"[SubmitAnswerAsync] Trenutni rezultat za {participant.User?.Username} -> Ukupno: {participant.Score}, Tačnih: {participant.CorrectAnswers}, Vreme: {participant.TotalTime:F2}s");
        }

        public async Task<List<LiveQuizParticipantDto>> GetLeaderboardAsync(string roomCode, AppContext context)
        {
            var participants = await context.LiveQuizParticipants
                .AsNoTracking()
                .Include(p => p.User)
                .Include(p => p.Room)
                .Where(p => p.Room.RoomCode == roomCode && p.User != null && p.User.Username.ToLower() != "admin")
                .ToListAsync();

            var result = participants
                .Select(p => new LiveQuizParticipantDto
                {
                    Username = p.User.Username,
                    Score = p.Score,
                    BonusPoints = 0,
                    CorrectAnswers = p.CorrectAnswers,
                    TotalTime = p.TotalTime
                })
                .OrderByDescending(x => x.Score)
                .ThenByDescending(x => x.CorrectAnswers)
                .ToList();

            return result;
        }


        public async Task StartRoomCountdownAsync(string roomCode, int countdownSeconds = 60)
        {
            if (_activeQuizzes.ContainsKey(roomCode))
            {
                // već aktivan kviz, ne radimo ništa
                return;
            }

            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppContext>();

            var room = await context.LiveQuizRooms.FirstOrDefaultAsync(r => r.RoomCode == roomCode);
            if (room == null || room.IsQuizStarted)
                return;

            var createdAt = room.CreatedAt;
            var elapsed = (DateTime.UtcNow - createdAt).TotalSeconds;

            int remainingSeconds = countdownSeconds - (int)elapsed;
            if (remainingSeconds <= 0)
            {
                await StartQuizAsync(roomCode);
                return;
            }

            // Šalji countdown događaje klijentima svake sekunde
            for (int i = remainingSeconds; i >= 0; i--)
            {
                await _hubContext.Clients.Group(roomCode).SendAsync("CountdownTick", i);
                await Task.Delay(1000);
            }

            // Na kraju pokreni kviz automatski ako nije startovan
            var updatedRoom = await context.LiveQuizRooms.FirstOrDefaultAsync(r => r.RoomCode == roomCode);
            if (updatedRoom != null && !updatedRoom.IsQuizStarted)
            {
                await StartQuizAsync(roomCode);
            }
        }


        public class QuizState
        {
            public Quiz Quiz { get; }
            public LiveQuizRoom Room { get; }
            public Question? CurrentQuestion { get; private set; }
            private HashSet<int> _answeredUserIds = new();
            public bool BonusAwarded { get; set; } = false;

            private readonly Dictionary<int, HashSet<int>> _userAnsweredQuestions = new();

            public DateTime QuestionStartTime { get; private set; }
            public int QuestionTimeLimitMs { get; set; } = 9000;

            public QuizState(Quiz quiz, LiveQuizRoom room)
            {
                Quiz = quiz;
                Room = room;
            }

            public void StartQuestion(Question question)
            {
                CurrentQuestion = question;
                _answeredUserIds.Clear();
                QuestionStartTime = DateTime.UtcNow;
                BonusAwarded = false;
            }

            public void MarkAnswered(int userId)
            {
                _answeredUserIds.Add(userId);
            }

            public bool AllParticipantsAnswered()
            {
                var userCount = Room.Participants.Count(p => p.User != null && p.User.Username.ToLower() != "admin");
                return _answeredUserIds.Count >= userCount;
            }

            public void ResetAnswers()
            {
                _answeredUserIds.Clear();
                _userAnsweredQuestions.Clear();
            }

            public bool TryMarkUserAnsweredQuestion(int userId, int questionId)
            {
                if (!_userAnsweredQuestions.ContainsKey(userId))
                {
                    _userAnsweredQuestions[userId] = new HashSet<int>();
                }

                if (_userAnsweredQuestions[userId].Contains(questionId))
                {
                    return false;
                }

                _userAnsweredQuestions[userId].Add(questionId);
                return true;
            }

            public void ClearCorrectAnswersForQuestion(int questionId)
            {
                
            }





        }
    }
}
