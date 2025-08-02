namespace BE.Dtos.Results
{
    public class UserResultDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string QuizTitle { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public int CorrectAnswers { get; set; }
        public double Percentage { get; set; }
        public TimeSpan Duration { get; set; }
        public int Points { get; set; }
    }
}
