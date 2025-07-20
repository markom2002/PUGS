using BE.Dtos;
using BE.Services;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OptionsController : ControllerBase
    {
        private readonly IOptionService _optionService;

        public OptionsController(IOptionService optionService)
        {
            _optionService = optionService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _optionService.GetAllAsync());
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var option = await _optionService.GetByIdAsync(id);
            if (option == null) return NotFound();
            return Ok(option);
        }

        [HttpPost]
        public async Task<IActionResult> Create(OptionDto dto)
        {
            var created = await _optionService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = (int)created.Id }, created);


        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, OptionDto dto)
        {
            var updated = await _optionService.UpdateAsync(id, dto);
            if (updated == null) return NotFound();
            return Ok(updated);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _optionService.DeleteAsync(id);
            return deleted ? NoContent() : NotFound();
        }
    }
}
