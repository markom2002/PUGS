namespace BE.Dtos
{
    public class CreateQuizDetailsDto
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Difficulty { get; set; } = string.Empty;
        public int TimeLimit { get; set; }
        public string Category { get; set; } = string.Empty;

        public List<CreateQuestionDto> Questions { get; set; } = new();
    }

    public class CreateQuestionDto
    {
        public string Text { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public int Points { get; set; }
        public bool AllowMultipleAnswers { get; set; }

        public string? CorrectTextAnswer { get; set; }
        public List<CreateOptionDto> Options { get; set; } = new();
    }

    public class CreateOptionDto
    {
        public string Text { get; set; } = string.Empty;
        public bool IsCorrect { get; set; }
    }
}
