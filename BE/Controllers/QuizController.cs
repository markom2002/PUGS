using Microsoft.AspNetCore.Mvc;
using BE.Services.Interfaces;
using BE.Dtos;
using BE.Dtos.Quiz;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/quizzes")]
    public class QuizController : ControllerBase
    {
        private readonly IQuizService _quizService;

        public QuizController(IQuizService quizService)
        {
            _quizService = quizService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<QuizDto>>> GetAll()
        {
            return Ok(await _quizService.GetAllAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<QuizDetailsDto>> GetById(int id)
        {
            try
            {
                return Ok(await _quizService.GetDetailsByIdAsync(id));
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<ActionResult<QuizDto>> Create(QuizDto dto)
        {
            return Ok(await _quizService.CreateAsync(dto));
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<QuizDto>> Update(int id, QuizDto dto)
        {
            try
            {
                return Ok(await _quizService.UpdateAsync(id, dto));
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                await _quizService.DeleteAsync(id);
                return NoContent();
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpGet("category/{category}")]
        public async Task<ActionResult<IEnumerable<QuizDto>>> GetByCategory(string category)
        {
            var quizzes = await _quizService.GetByCategoryAsync(category);
            return Ok(quizzes);
        }

        [HttpPost("full")]
        public async Task<ActionResult<QuizDetailsDto>> CreateWithDetails([FromBody] CreateQuizDetailsDto dto)
        {
            var createdQuiz = await _quizService.CreateWithDetailsAsync(dto);
            return Ok(createdQuiz);
        }

        [HttpPut("full/{id}")]
        public async Task<ActionResult<QuizDetailsDto>> UpdateWithDetails(int id, UpdateQuizDetailsDto dto)
        {
            try
            {
                return Ok(await _quizService.UpdateWithDetailsAsync(id, dto));
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }


        [HttpDelete("questions/{questionId}")]
        public async Task<IActionResult> DeleteQuestion(int questionId)
        {
            try
            {
                await _quizService.DeleteQuestionAsync(questionId);
                return NoContent();
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }



    }
}
