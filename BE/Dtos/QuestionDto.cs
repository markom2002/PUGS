namespace BE.Dtos
{
    public class QuestionDto
    {
        public string Text { get; set; } = default!;
        public string Type { get; set; } = default!;
        public int Points { get; set; }
        public int QuizId { get; set; }
    }
}
