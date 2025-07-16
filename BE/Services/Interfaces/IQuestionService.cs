using BE.Dtos;
using BE.Models;

namespace BE.Services.Interfaces
{
    public interface IQuestionService
    {
        Task<IEnumerable<Question>> GetAllAsync();
        Task<Question> GetByIdAsync(int id);
        Task<Question> CreateAsync(QuestionDto dto);
        Task UpdateAsync(int id, QuestionDto dto);
        Task DeleteAsync(int id);
    }
}
