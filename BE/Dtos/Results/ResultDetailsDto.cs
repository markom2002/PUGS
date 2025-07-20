namespace BE.Dtos.Results
{
    public class ResultDetailsDto
    {
        public int Id { get; set; }
        public string QuizTitle { get; set; } = string.Empty;
        public int CorrectAnswers { get; set; }
        public double Percentage { get; set; }
        public int Points { get; set; }
        public TimeSpan Duration { get; set; }
        public DateTime CreatedAt { get; set; }

        public List<QuestionAnswerDto> Answers { get; set; } = new();
    }

    public class QuestionAnswerDto
    {
        public int QuestionId { get; set; }
        public string QuestionText { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;

        public List<string> UserAnswers { get; set; } = new(); // Opcije ili tekst
        public List<string> CorrectAnswers { get; set; } = new();
        public bool IsCorrect { get; set; }
    }
}
