using BE.Dtos;
using BE.Dtos.Quiz;
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
            var quiz = await _context.Quizzes
                .Include(q => q.Questions)
                    .ThenInclude(q => q.Options)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (quiz == null)
                throw new Exception("Quiz not found");

            // Prvo ukloni sve odgovore (ako koristiš Answer entitet)
            var questionIds = quiz.Questions.Select(q => q.Id).ToList();

            var answers = await _context.Answers
                .Where(a => questionIds.Contains(a.QuestionId))
                .ToListAsync();

            _context.Answers.RemoveRange(answers);

            // Ukloni sve opcije
            foreach (var question in quiz.Questions)
            {
                _context.Options.RemoveRange(question.Options);
            }

            // Ukloni sva pitanja
            _context.Questions.RemoveRange(quiz.Questions);

            // Na kraju ukloni kviz
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

        public async Task<QuizDetailsDto> GetDetailsByIdAsync(int id)
        {
            var quiz = await _context.Quizzes
                .Include(q => q.Questions)
                    .ThenInclude(q => q.Options)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (quiz == null)
                throw new Exception("Quiz not found");

            var quizDetailsDto = new QuizDetailsDto
            {
                Id = quiz.Id,
                Title = quiz.Title,
                Description = quiz.Description,
                Difficulty = quiz.Difficulty,
                TimeLimit = quiz.TimeLimit,
                Category = quiz.Category,
                Questions = quiz.Questions.Select(question => new QuestionDto
                {
                    Id = question.Id,
                    Text = question.Text,
                    Type = question.Type,
                    QuizId = quiz.Id, // Obavezno ako je deo QuestionDto
                    Points = question.Points,
                    AllowMultipleAnswers = question.AllowMultipleAnswers,
                    CorrectTextAnswer = question.CorrectTextAnswer,
                    Options = question.Options.Select(option => new OptionDto
                    {
                        Id = option.Id,
                        Text = option.Text,
                        IsCorrect = option.IsCorrect,
                        QuestionId = question.Id // Veza sa pitanjem
                    }).ToList()
                }).ToList()
            };

            return quizDetailsDto;
        }

        public async Task<IEnumerable<QuizDto>> GetByCategoryAsync(string category)
        {
            return await _context.Quizzes
                .Where(q => q.Category.ToLower() == category.ToLower())
                .Select(q => new QuizDto
                {
                    Id = q.Id,
                    Title = q.Title,
                    Description = q.Description,
                    Difficulty = q.Difficulty,
                    TimeLimit = q.TimeLimit,
                    Category = q.Category,
                })
                .ToListAsync();
        }

        public async Task<QuizDetailsDto> CreateWithDetailsAsync(CreateQuizDetailsDto dto)
        {
            var quiz = new Quiz
            {
                Title = dto.Title,
                Description = dto.Description,
                Difficulty = dto.Difficulty,
                TimeLimit = dto.TimeLimit,
                Category = dto.Category,
                Questions = dto.Questions.Select(q => new Question
                {
                    Text = q.Text,
                    Type = q.Type,
                    Points = q.Points,
                    AllowMultipleAnswers = q.Type.ToLower() == "multiple" || q.Type.ToLower() == "multiplechoice",
                    CorrectTextAnswer = q.CorrectTextAnswer,
                    Options = q.Options.Select(o => new Option
                    {
                        Text = o.Text,
                        IsCorrect = o.IsCorrect
                    }).ToList()
                }).ToList()
            };

            _context.Quizzes.Add(quiz);
            await _context.SaveChangesAsync();

            return await GetDetailsByIdAsync(quiz.Id);
        }


        public async Task<QuizDetailsDto> UpdateWithDetailsAsync(int id, UpdateQuizDetailsDto dto)
        {
            var quiz = await _context.Quizzes
                .Include(q => q.Questions)
                    .ThenInclude(q => q.Options)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (quiz == null)
                throw new Exception("Quiz not found");

            // Ažuriranje osnovnih podataka
            quiz.Title = dto.Title;
            quiz.Description = dto.Description;
            quiz.Difficulty = dto.Difficulty;
            quiz.TimeLimit = dto.TimeLimit;
            quiz.Category = dto.Category;

            // Ažuriranje postojećih pitanja i dodavanje novih
            foreach (var questionDto in dto.Questions)
            {
                var question = quiz.Questions.FirstOrDefault(q => q.Id == questionDto.Id);

                if (question == null)
                {
                    // Novo pitanje
                    question = new Question
                    {
                        Text = questionDto.Text,
                        Type = questionDto.Type,
                        Points = questionDto.Points,
                        AllowMultipleAnswers = questionDto.Type.ToLower() == "multiple" || questionDto.Type.ToLower() == "multiplechoice",
                        CorrectTextAnswer = questionDto.CorrectTextAnswer,
                        QuizId = id,
                        Options = questionDto.Options.Select(opt => new Option
                        {
                            Text = opt.Text,
                            IsCorrect = opt.IsCorrect
                        }).ToList()
                    };

                    quiz.Questions.Add(question);
                }
                else
                {
                    // Postojeće pitanje - update
                    question.Text = questionDto.Text;
                    question.Type = questionDto.Type;
                    question.Points = questionDto.Points;
                    question.AllowMultipleAnswers = questionDto.AllowMultipleAnswers;
                    question.CorrectTextAnswer = questionDto.CorrectTextAnswer;
                    _context.Options.RemoveRange(question.Options);
                    question.Options = questionDto.Options.Select(opt => new Option
                    {
                        Text = opt.Text,
                        IsCorrect = opt.IsCorrect
                    }).ToList();
                }
            }

            await _context.SaveChangesAsync();
            return await GetDetailsByIdAsync(id);
        }



        public async Task DeleteQuestionAsync(int questionId)
        {
            var question = await _context.Questions
                .Include(q => q.Options)
                .FirstOrDefaultAsync(q => q.Id == questionId);

            if (question == null)
                throw new Exception("Question not found");

            // Brisanje opcija vezanih za pitanje
            _context.Options.RemoveRange(question.Options);

            // Brisanje odgovora koji referenciraju pitanje
            var answersToRemove = await _context.Answers
                .Where(a => a.QuestionId == questionId)
                .ToListAsync();
            _context.Answers.RemoveRange(answersToRemove);

            // Brisanje pitanja
            _context.Questions.Remove(question);

            await _context.SaveChangesAsync();
        }





    }
}
