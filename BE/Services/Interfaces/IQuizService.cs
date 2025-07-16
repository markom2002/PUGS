using BE.Dtos;

namespace BE.Services.Interfaces
{
    public interface IQuizService
    {
        Task<IEnumerable<QuizDto>> GetAllAsync();
        Task<QuizDto> GetByIdAsync(int id);
        Task<QuizDto> CreateAsync(QuizDto dto);
        Task<QuizDto> UpdateAsync(int id, QuizDto dto);
        Task DeleteAsync(int id);


    }
}
