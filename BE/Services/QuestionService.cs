using BE.Dtos;
using BE.Models;
using BE.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BE.Services
{
    public class QuestionService : IQuestionService
    {
        private readonly AppContext _context;

        public QuestionService(AppContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Question>> GetAllAsync()
        {
            return await _context.Questions.Include(q => q.Quiz).ToListAsync();
        }

        public async Task<Question> GetByIdAsync(int id)
        {
            var question = await _context.Questions
                .Include(q => q.Quiz)
                .Include(q => q.Options) 
                .FirstOrDefaultAsync(q => q.Id == id);
            if (question == null)
                throw new Exception("Question not found");
            return question;
        }

        public async Task<Question> CreateAsync(QuestionDto dto)
        {
            var question = new Question
            {
                Text = dto.Text,
                Type = dto.Type,
                Points = dto.Points,
                QuizId = dto.QuizId
            };
            _context.Questions.Add(question);
            await _context.SaveChangesAsync();
            return question;
        }

        public async Task UpdateAsync(int id, QuestionDto dto)
        {
            var question = await _context.Questions.FindAsync(id);
            if (question == null)
                throw new Exception("Question not found");

            question.Text = dto.Text;
            question.Type = dto.Type;
            question.Points = dto.Points;
            question.QuizId = dto.QuizId;

            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var question = await _context.Questions.FindAsync(id);
            if (question == null)
                throw new Exception("Question not found");
            _context.Questions.Remove(question);
            await _context.SaveChangesAsync();
        }
    }
}
