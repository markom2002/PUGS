using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using BE.Models;
using BE.Dtos.Results;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ResultsController : ControllerBase
    {
        private readonly AppContext _context;
        private readonly IMapper _mapper;

        public ResultsController(AppContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        // GET: api/results
        [Authorize(Roles = "Admin")]
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
            var userId = int.Parse(User.Claims.First(c => c.Type == "id").Value);

            var results = await _context.Results
                .Where(r => r.UserId == userId)
                .Include(r => r.Quiz)
                .ToListAsync();

            return Ok(_mapper.Map<IEnumerable<ResultViewDto>>(results));
        }

        // POST: api/results
        [Authorize]
        [HttpPost]
        public async Task<ActionResult<ResultViewDto>> CreateResult(CreateResultDto dto)
        {
            var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "id");
            if (userIdClaim == null)
                return Unauthorized("User ID claim is missing in token.");

            if (!int.TryParse(userIdClaim.Value, out int userId))
                return BadRequest("Invalid User ID claim.");

            var result = _mapper.Map<Result>(dto);
            result.UserId = userId;
            result.CreatedAt = DateTime.UtcNow;

            _context.Results.Add(result);
            await _context.SaveChangesAsync();

            var resultDto = _mapper.Map<ResultViewDto>(result);
            return CreatedAtAction(nameof(GetUserResults), new { id = result.Id }, resultDto);
        }

        // GET: api/results/leaderboard?quizId=1&period=monthly
        [AllowAnonymous]
        [HttpGet("leaderboard")]
        public async Task<ActionResult<IEnumerable<ResultViewDto>>> GetLeaderboard(int quizId, string period = "all")
        {
            var query = _context.Results.Include(r => r.Quiz)
                .Where(r => r.QuizId == quizId);

            if (period == "monthly")
            {
                var monthAgo = DateTime.UtcNow.AddMonths(-1);
                query = query.Where(r => r.CreatedAt >= monthAgo);
            }
            else if (period == "weekly")
            {
                var weekAgo = DateTime.UtcNow.AddDays(-7);
                query = query.Where(r => r.CreatedAt >= weekAgo);
            }

            var topResults = await query
                .OrderByDescending(r => r.Percentage)
                .ThenBy(r => r.Duration)
                .Take(10)
                .ToListAsync();

            return Ok(_mapper.Map<IEnumerable<ResultViewDto>>(topResults));
        }
    }
}
