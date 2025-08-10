using Microsoft.AspNetCore.SignalR;
using BE.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using BE.Models.QuizHub;
using BE.Dtos.QuizHub;
using BE.Services.QuizHub;  

namespace BE.Services.QuizHub
{
    public class QuizHub : Hub
    {
        private readonly AppContext _context;
        private readonly LiveQuizManager _liveQuizManager;

        public QuizHub(AppContext context, LiveQuizManager liveQuizManager)
        {
            _context = context;
            _liveQuizManager = liveQuizManager;
        }

        public async Task JoinRoom(string roomCode, string userName)
        {
            var userIdClaim = Context.User?.FindFirst("id");
            if (userIdClaim == null)
            {
                await Clients.Caller.SendAsync("Error", "Unauthorized");
                return;
            }

            var userId = int.Parse(userIdClaim.Value);

            var room = await _context.LiveQuizRooms
                .Include(r => r.Participants)
                .ThenInclude(p => p.User)
                .FirstOrDefaultAsync(r => r.RoomCode == roomCode);

            if (room == null)
            {
                await Clients.Caller.SendAsync("Error", "Room not found");
                return;
            }

            var existing = room.Participants.FirstOrDefault(p => p.UserId == userId);
            if (existing == null)
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    await Clients.Caller.SendAsync("Error", "User not found");
                    return;
                }

                var participant = new LiveQuizParticipant
                {
                    RoomId = room.Id,
                    UserId = userId,
                    User = user,
                    ConnectionId = Context.ConnectionId
                };

                room.Participants.Add(participant);
                await _context.SaveChangesAsync();
            }
            else
            {
                existing.ConnectionId = Context.ConnectionId;
                await _context.SaveChangesAsync();
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, roomCode);
            await Clients.Group(roomCode).SendAsync("UserJoined", userName);

            var currentUsernames = room.Participants
                .Select(p => p.User.Username)
                .ToList();

            await Clients.Group(roomCode).SendAsync("UsersUpdated", currentUsernames);
        }

        public async Task LeaveRoom(string roomCode)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomCode);
        }

        public async Task SendAnswer(string roomCode, string userId, int questionId, string textAnswer)
        {
            await Clients.Group(roomCode).SendAsync("UserAnswered", userId, questionId, textAnswer);
        }

        
        public async Task StartQuiz(string roomCode)
        {
            await _liveQuizManager.StartQuizAsync(roomCode);
        }

        public async Task StartRoomCountdown(string roomCode)
        {
            await _liveQuizManager.StartRoomCountdownAsync(roomCode);
        }



        public async Task SubmitAnswer(SubmitAnswerDto dto)
        {
            var userIdClaim = Context.User?.FindFirst("id");
            if (userIdClaim == null)
            {
                await Clients.Caller.SendAsync("Error", "Unauthorized");
                return;
            }

            int userId = int.Parse(userIdClaim.Value);

            await _liveQuizManager.SubmitAnswerAsync(dto.RoomCode, userId, dto.QuestionId, dto.SelectedOptionIds, dto.TextAnswer, dto.DurationMs);
        }
    }
}
