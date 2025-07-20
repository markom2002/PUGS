using System;

namespace BE.Models
{
    public class Result
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int QuizId { get; set; }
        public int CorrectAnswers { get; set; }
        public double Percentage { get; set; }
        public TimeSpan Duration { get; set; }
        public DateTime CreatedAt { get; set; }
        public int Points { get; set; }

        public User User { get; set; }
        public Quiz Quiz { get; set; }

        public ICollection<Answer> Answers { get; set; } = new List<Answer>();
    }
}
