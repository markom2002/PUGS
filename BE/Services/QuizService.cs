using BE.Dtos;
using BE.Models;
using BE.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BE.Services
{
    public class QuizService : IQuizService
    {
        private readonly AppContext _context;

        public QuizService(AppContext context)
        {
            _context = context;
        }

        public async Task<QuizDto> CreateAsync(QuizDto dto)
        {
            var quiz = new Quiz
            {
                Title = dto.Title,
                Description = dto.Description,
                Difficulty = dto.Difficulty,
                TimeLimit = dto.TimeLimit,
                Category = dto.Category
            };

            _context.Quizzes.Add(quiz);
            await _context.SaveChangesAsync();

            dto.Id = quiz.Id;
            return dto;
        }

        public async Task DeleteAsync(int id)
        {
            var quiz = await _context.Quizzes.FindAsync(id);
            if (quiz == null) throw new Exception("Quiz not found");

            _context.Quizzes.Remove(quiz);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<QuizDto>> GetAllAsync()
        {
            return await _context.Quizzes.Select(q => new QuizDto
            {
                Id = q.Id,
                Title = q.Title,
                Description = q.Description,
                Difficulty = q.Difficulty,
                TimeLimit = q.TimeLimit,
                Category = q.Category


            }).ToListAsync();

        }

        public async Task<QuizDto> GetByIdAsync(int id)
        {
            var quiz = await _context.Quizzes.FindAsync(id);
            if (quiz == null) throw new Exception("Quiz not found");

            return new QuizDto
            {
                Id = quiz.Id,
                Title = quiz.Title,
                Description = quiz.Description,
                Difficulty = quiz.Difficulty,
                TimeLimit = quiz.TimeLimit,
                Category = quiz.Category
            };
        }

        public async Task<QuizDto> UpdateAsync(int id, QuizDto dto)
        {
            var quiz = await _context.Quizzes.FindAsync(id);
            if (quiz == null) throw new Exception("Quiz not found");

            quiz.Title = dto.Title;
            quiz.Description = dto.Description;
            quiz.Difficulty = dto.Difficulty;
            quiz.TimeLimit = dto.TimeLimit;
            quiz.Category = dto.Category;

            await _context.SaveChangesAsync();

            return dto;
        }
    }
}
