namespace BE.Dtos.Results
{
    public class ResultViewDto
    {
        public int Id { get; set; }
        public int QuizId { get; set; }
        public string QuizTitle { get; set; }
        public int CorrectAnswers { get; set; }
        public double Percentage { get; set; }
        public int Points { get; set; }

        public TimeSpan Duration { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
