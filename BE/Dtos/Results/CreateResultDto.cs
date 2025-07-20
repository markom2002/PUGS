namespace BE.Dtos.Results
{
    public class CreateResultDto
    {
        public int QuizId { get; set; }
        public int CorrectAnswers { get; set; }
        public double Percentage { get; set; }
        public TimeSpan Duration { get; set; }
        public int Points { get; set; }
        public List<AnswerDto> Answers { get; set; } = new();

    }
}
