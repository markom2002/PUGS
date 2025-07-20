using BE.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace BE.Services.Interfaces
{
    public interface IQuizService
    {
        Task<IEnumerable<QuizDto>> GetAllAsync();
        Task<QuizDto> GetByIdAsync(int id);
        Task<QuizDto> CreateAsync(QuizDto dto);
        Task<QuizDto> UpdateAsync(int id, QuizDto dto);
        Task DeleteAsync(int id);
        Task<QuizDetailsDto> GetDetailsByIdAsync(int id);

        Task<IEnumerable<QuizDto>> GetByCategoryAsync(string category);


    }
}
