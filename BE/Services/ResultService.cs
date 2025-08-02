using BE;
using BE.Dtos.Leaderboard;
using BE.Dtos.Results;
using BE.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace BE.Services
{
    public class ResultService : IResultService
    {
        private readonly AppContext _context;

        public ResultService(AppContext context)
        {
            _context = context;
        }

        public async Task<ResultDetailsDto> GetDetailsByIdAsync(int resultId)
        {
            var result = await _context.Results
                .Include(r => r.Quiz)
                .Include(r => r.Answers)
                    .ThenInclude(a => a.Question)
                        .ThenInclude(q => q.Options)
                .FirstOrDefaultAsync(r => r.Id == resultId);

            if (result == null)
                throw new Exception("Result not found");

            var dto = new ResultDetailsDto
            {
                Id = result.Id,
                QuizId = result.QuizId,
                QuizTitle = result.Quiz.Title,
                CorrectAnswers = result.CorrectAnswers,
                Percentage = result.Percentage,
                Points = result.Points,
                Duration = result.Duration,
                CreatedAt = result.CreatedAt,
                Answers = result.Answers.Select(a => new QuestionAnswerDto
                {
                    QuestionId = a.Question.Id,
                    QuestionText = a.Question.Text,
                    Type = a.Question.Type,
                    UserAnswers = !string.IsNullOrEmpty(a.SelectedOptionIds)
                        ?a.SelectedOptionIds.Split(',')
                        .Select(idStr => int.TryParse(idStr, out int id) ? id : 0)
                        .Where(id => id != 0)
                        .Select(id => a.Question.Options.FirstOrDefault(o => o.Id == id)?.Text ?? "")
                         .ToList()
                    : (!string.IsNullOrEmpty(a.UserAnswer) ? new List<string> { a.UserAnswer } : new List<string>()),
                    CorrectAnswers = a.Question.Type.ToLower() == "fill" || a.Question.Type.ToLower() == "text"
                        ? (!string.IsNullOrWhiteSpace(a.Question.CorrectTextAnswer)
                            ? new List<string> { a.Question.CorrectTextAnswer }
                            : a.Question.Options.Where(o => o.IsCorrect).Select(o => o.Text).ToList())
                        : a.Question.Options.Where(o => o.IsCorrect).Select(o => o.Text).ToList(),

                    IsCorrect = a.Question.Type.ToLower() == "fill" || a.Question.Type.ToLower() == "text"
                       ? a.Question.Options
                        .Where(o => o.IsCorrect)
                        .Any(o => string.Equals(o.Text.Trim(), a.UserAnswer?.Trim(), StringComparison.OrdinalIgnoreCase))
                            || string.Equals(a.Question.CorrectTextAnswer?.Trim(), a.UserAnswer?.Trim(), StringComparison.OrdinalIgnoreCase)
                        : a.IsCorrect

                }).ToList()
            };

            return dto;
        }

        public async Task<List<UserResultDto>> GetAllUserResultsAsync()
        {
            var results = await _context.Results
                .Include(r => r.User)
                .Include(r => r.Quiz)
                .ToListAsync();

            return results.Select(r => new UserResultDto
            {
                Id = r.Id,
                Username = r.User.Username,
                QuizTitle = r.Quiz.Title,
                CreatedAt = r.CreatedAt,
                CorrectAnswers = r.CorrectAnswers,
                Percentage = r.Percentage,
                Duration = r.Duration,
                Points = r.Points
            }).ToList();
        }

        public async Task<List<LeaderboardEntryDto>> GetLeaderboardAsync(LeaderboardFilterDto filter)
        {
            var query = _context.Results
                .Include(r => r.User)
                .Include(r => r.Quiz)
                .AsQueryable();

            if (filter.QuizId.HasValue)
                query = query.Where(r => r.QuizId == filter.QuizId.Value);

            if (filter.TimePeriod == "weekly")
            {
                var start = DateTime.UtcNow.AddDays(-7);
                query = query.Where(r => r.CreatedAt >= start);
            }
            else if (filter.TimePeriod == "monthly")
            {
                var start = DateTime.UtcNow.AddMonths(-1);
                query = query.Where(r => r.CreatedAt >= start);
            }

            var ordered = await query
                .OrderByDescending(r => r.Points)
                .ThenBy(r => r.CreatedAt)
                .ToListAsync();

            var leaderboard = ordered
                .Select((r, index) => new LeaderboardEntryDto
                {
                    Position = index + 1,
                    UserName = r.User.Username,
                    Points = r.Points,
                    CreatedAt = r.CreatedAt
                })
                .ToList();

            return leaderboard;
        }



        public async Task<List<UserProgressDto>> GetUserProgressAsync(int userId, int quizId)
        {
            var results = await _context.Results
                .Where(r => r.UserId == userId && r.QuizId == quizId)
                .Include(r => r.Quiz)
                    .ThenInclude(q => q.Questions)
                .OrderBy(r => r.CreatedAt)
                .ToListAsync();

            return results.Select(r => new UserProgressDto
            {
                CreatedAt = r.CreatedAt,
                Points = r.Points,
                Percentage = (int)Math.Round((double)r.Points * 100 / r.Quiz.Questions.Sum(q => q.Points))
            }).ToList();
        }


    }
}
