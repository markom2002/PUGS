using AutoMapper;
using BE;
using BE.Dtos;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services
{
    public class OptionService : IOptionService
    {
        private readonly AppContext _context;
        private readonly IMapper _mapper;

        public OptionService(AppContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<IEnumerable<OptionDto>> GetAllAsync()
        {
            var options = await _context.Options.ToListAsync();
            return _mapper.Map<IEnumerable<OptionDto>>(options);
        }

        public async Task<OptionDto?> GetByIdAsync(int id)
        {
            var option = await _context.Options.FindAsync(id);
            return option == null ? null : _mapper.Map<OptionDto>(option);
        }

        public async Task<OptionDto> CreateAsync(OptionDto dto)
        {
            var option = _mapper.Map<Option>(dto);
            _context.Options.Add(option);
            await _context.SaveChangesAsync();
            return _mapper.Map<OptionDto>(option);
        }

        public async Task<OptionDto?> UpdateAsync(int id, OptionDto dto)
        {
            var option = await _context.Options.FindAsync(id);
            if (option == null) return null;

            
            if (dto.IsCorrect)
            {
                
                var question = await _context.Questions
                    .FirstOrDefaultAsync(q => q.Id == dto.QuestionId);

                if (question != null &&
                    (question.Type == "single" || question.Type == "truefalse"))
                {
                    
                    var otherOptions = await _context.Options
                        .Where(o => o.QuestionId == dto.QuestionId && o.Id != id)
                        .ToListAsync();

                    foreach (var otherOption in otherOptions)
                    {
                        otherOption.IsCorrect = false;
                    }
                }
            }

            
            option.Text = dto.Text;
            option.IsCorrect = dto.IsCorrect;
            option.QuestionId = dto.QuestionId;

            await _context.SaveChangesAsync();

            return _mapper.Map<OptionDto>(option);
        }


        public async Task<bool> DeleteAsync(int id)
        {
            var option = await _context.Options.FindAsync(id);
            if (option == null) return false;

            _context.Options.Remove(option);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
