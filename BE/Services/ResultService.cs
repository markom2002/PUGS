using BE;
using BE.Dtos.Results;
using BE.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace BE.Services
{
    public class ResultService : IResultService
    {
        private readonly AppContext _context;

        public ResultService(AppContext context)
        {
            _context = context;
        }

        public async Task<ResultDetailsDto> GetDetailsByIdAsync(int resultId)
        {
            var result = await _context.Results
                .Include(r => r.Quiz)
                .Include(r => r.Answers)
                    .ThenInclude(a => a.Question)
                        .ThenInclude(q => q.Options)
                .FirstOrDefaultAsync(r => r.Id == resultId);

            if (result == null)
                throw new Exception("Result not found");

            var dto = new ResultDetailsDto
            {
                Id = result.Id,
                QuizTitle = result.Quiz.Title,
                CorrectAnswers = result.CorrectAnswers,
                Percentage = result.Percentage,
                Points = result.Points,
                Duration = result.Duration,
                CreatedAt = result.CreatedAt,
                Answers = result.Answers.Select(a => new QuestionAnswerDto
                {
                    QuestionId = a.Question.Id,
                    QuestionText = a.Question.Text,
                    Type = a.Question.Type,
                    UserAnswers = !string.IsNullOrEmpty(a.SelectedOptionIds)
                        ?a.SelectedOptionIds.Split(',')
                        .Select(idStr => int.TryParse(idStr, out int id) ? id : 0)
                        .Where(id => id != 0)
                        .Select(id => a.Question.Options.FirstOrDefault(o => o.Id == id)?.Text ?? "")
                         .ToList()
                    : (!string.IsNullOrEmpty(a.UserAnswer) ? new List<string> { a.UserAnswer } : new List<string>()),
                    CorrectAnswers = a.Question.Options
                        .Where(o => o.IsCorrect)
                        .Select(o => o.Text)
                        .ToList(),
                    IsCorrect = a.IsCorrect
                }).ToList()
            };

            return dto;
        }
    }
}
