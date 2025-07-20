namespace BE.Dtos
{
    public class QuestionDto
    {
        public int Id { get; set; }
        public string Text { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public int Points { get; set; }
        public int QuizId { get; set; }
        public bool AllowMultipleAnswers { get; set; }

        public List<OptionDto> Options { get; set; } = new();
    }
}
