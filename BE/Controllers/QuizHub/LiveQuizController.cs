using BE.Dtos.QuizHub;
using BE.Models.QuizHub;
using BE.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BE.Services.QuizHub;

namespace BE.Controllers.QuizHub
{
    [ApiController]
    [Route("api/livequiz")]
    public class LiveQuizController : ControllerBase
    {
        private readonly AppContext _context;

        public LiveQuizController(AppContext context)
        {
            _context = context;
        }

        [HttpPost("create")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateRoom([FromBody] CreateRoomDto dto)
        {
            var roomCode = Guid.NewGuid().ToString("N")[..6].ToUpper(); // npr: 6 random karaktera

            var room = new LiveQuizRoom
            {
                RoomCode = roomCode,
                QuizId = dto.QuizId,
                CreatedAt = DateTime.Now
            };

            _context.LiveQuizRooms.Add(room);
            await _context.SaveChangesAsync();

            return Ok(new { room.RoomCode });
        }

        [HttpPost("join")]
        [Authorize]
        public async Task<IActionResult> JoinRoom([FromBody] JoinRoomDto dto)
        {
            var room = await _context.LiveQuizRooms
                .Include(r => r.Participants)
                    .ThenInclude(p => p.User)
                .FirstOrDefaultAsync(r => r.RoomCode == dto.RoomCode);

            if (room == null)
                return NotFound("Room not found");

            var userId = int.Parse(User.FindFirst("id")!.Value);

            var existing = room.Participants.FirstOrDefault(p => p.UserId == userId);
            if (existing == null)
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null) return Unauthorized("User not found");

                var participant = new LiveQuizParticipant
                {
                    RoomId = room.Id,
                    UserId = userId,
                    User = user,
                    
                };

                room.Participants.Add(participant);
                await _context.SaveChangesAsync();
            }
            else
            {
                
                await _context.SaveChangesAsync();
            }

            
            var participantDtos = room.Participants.Select(p => new LiveQuizParticipantDto
            {
                Id = p.Id,
                Username = p.User.Username,
                Score = p.Score,
                CorrectAnswers = p.CorrectAnswers,
                TotalTime = p.TotalTime
            }).ToList();

            return Ok(new { message = "Successfully joined", participants = participantDtos });
        }


        [HttpPost("start")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> StartQuiz([FromQuery] string roomCode, [FromServices] LiveQuizManager manager)
        {
            await manager.StartQuizAsync(roomCode);
            return Ok(new { message = "Kviz pokrenut" });
        }

        [HttpGet("participants/{roomCode}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetParticipants(string roomCode)
        {
            var room = await _context.LiveQuizRooms
                .Include(r => r.Participants)
                .ThenInclude(p => p.User)
                .FirstOrDefaultAsync(r => r.RoomCode == roomCode);

            if (room == null)
                return NotFound("Room not found");

            var participants = room.Participants
                .Where(p => !p.User.Role.Contains("Admin")) 
                .Select(p => p.User.Username)
                .ToList();


            return Ok(participants);
        }


    }

}
