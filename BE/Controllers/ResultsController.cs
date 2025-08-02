using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using BE.Models;
using BE.Dtos.Results;
using BE.Dtos;
using System.Security.Claims;
using BE.Services;
using BE.Services.Interfaces;
using BE.Dtos.Leaderboard;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/results")]
    public class ResultsController : ControllerBase
    {
        private readonly AppContext _context;
        private readonly IMapper _mapper;
        private readonly IResultService _resultService;

        public ResultsController(AppContext context, IMapper mapper, IResultService resultService)
        {
            _context = context;
            _mapper = mapper;
            _resultService = resultService;
        }

        // GET: api/results
        [Authorize]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ResultViewDto>>> GetAllResults()
        {
            var results = await _context.Results
                .Include(r => r.Quiz)
                .ToListAsync();

            return Ok(_mapper.Map<IEnumerable<ResultViewDto>>(results));
        }

        // GET: api/results/user
        [Authorize]
        [HttpGet("user")]
        public async Task<ActionResult<IEnumerable<ResultViewDto>>> GetUserResults()
        {
            var userIdClaim = User.FindFirst("id");
            if (userIdClaim == null)
            {
                return Unauthorized("Nije pronađen ID korisnika u tokenu.");
            }

            if (!int.TryParse(userIdClaim.Value, out int userId))
            {
                return BadRequest("Nevalidan ID korisnika.");
            }

            var results = await _context.Results
                .Where(r => r.UserId == userId)
                .Include(r => r.Quiz)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Ok(_mapper.Map<IEnumerable<ResultViewDto>>(results));
        }

        // POST: api/results
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> CreateResult(CreateResultDto dto)
        {
            var userIdClaim = User.FindFirst("id");
            if (userIdClaim == null)
            {
                return Unauthorized("Korisnik nije prijavljen.");
            }
            var userId = int.Parse(userIdClaim.Value);

            var quiz = await _context.Quizzes
                .Include(q => q.Questions)
                    .ThenInclude(q => q.Options)
                .FirstOrDefaultAsync(q => q.Id == dto.QuizId);

            if (quiz == null) return NotFound("Quiz not found");

            int totalPoints = 0;
            int correctAnswers = 0;

            var result = new Result
            {
                QuizId = dto.QuizId,
                UserId = userId,
                CreatedAt = DateTime.Now,
                Answers = new List<Answer>(),
                Duration = dto.Duration
            };

            foreach (var answerDto in dto.Answers)
            {
                var question = quiz.Questions.FirstOrDefault(q => q.Id == answerDto.QuestionId);
                if (question == null) continue;

                bool isCorrect = false;

                if (question.Type == "single" || question.Type == "multiple")
                {
                    var correctOptions = question.Options.Where(o => o.IsCorrect).Select(o => o.Id).OrderBy(x => x);
                    var selectedOptions = answerDto.SelectedOptionIds.OrderBy(x => x);
                    isCorrect = correctOptions.SequenceEqual(selectedOptions);
                }
                else if (question.Type == "truefalse")
                {
                    var correctOption = question.Options.FirstOrDefault(o => o.IsCorrect);
                    isCorrect = correctOption != null && answerDto.SelectedOptionIds.Contains(correctOption.Id);
                }
                else if (question.Type == "fill" || question.Type == "text")
                {
                    var correctOption = question.Options.FirstOrDefault(o => o.IsCorrect);

                    if (correctOption != null)
                    {
                        isCorrect = string.Equals(correctOption.Text.Trim(), answerDto.UserAnswer?.Trim(), StringComparison.OrdinalIgnoreCase);
                    }
                    else if (!string.IsNullOrWhiteSpace(question.CorrectTextAnswer))
                    {
                        isCorrect = string.Equals(question.CorrectTextAnswer.Trim(), answerDto.UserAnswer?.Trim(), StringComparison.OrdinalIgnoreCase);
                    }
                }

                if (isCorrect)
                {
                    totalPoints += question.Points;
                    correctAnswers++;
                }
                // ➕ Dodavanje odgovora u listu odgovora
                var answer = new Answer
                {
                    QuestionId = answerDto.QuestionId,
                    SelectedOptionIds = string.Join(",", answerDto.SelectedOptionIds), // Ako je string, ili koristi poseban AnswerOption entitet ako imaš vezu
                    UserAnswer = answerDto.UserAnswer,
                    IsCorrect = isCorrect
                };

                result.Answers.Add(answer);
            }

            result.Points = totalPoints;
            result.CorrectAnswers = correctAnswers;
            result.Percentage = quiz.Questions.Count > 0
                ? Math.Round((double)correctAnswers * 100 / quiz.Questions.Count, 2)
                : 0;

            _context.Results.Add(result);
            await _context.SaveChangesAsync();



            return Ok();
        }


        // GET: api/results/{id}
        [Authorize]
        [HttpGet("{id}")]
        public async Task<ActionResult<ResultDetailsDto>> GetResultDetails(int id)
        {
            try
            {
                var resultDetails = await _resultService.GetDetailsByIdAsync(id);
                return Ok(resultDetails);
            }
            catch (Exception ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpGet("all")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<UserResultDto>>> GetAllUserResults()
        {
            var results = await _resultService.GetAllUserResultsAsync();
            return Ok(results);
        }



        [HttpPost("leaderboard")]
        public async Task<IActionResult> GetLeaderboard([FromBody] LeaderboardFilterDto filter)
        {
            var leaderboard = await _resultService.GetLeaderboardAsync(filter);
            return Ok(leaderboard);
        }


        [Authorize]
        [HttpGet("progress/{quizId}")]
        public async Task<IActionResult> GetUserProgress(int quizId)
        {
            var userIdClaim = User.FindFirst("id");
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
                return Unauthorized();

            var progress = await _resultService.GetUserProgressAsync(userId, quizId);
            return Ok(progress);
        }





    }
}
