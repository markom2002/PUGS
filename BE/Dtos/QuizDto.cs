namespace BE.Dtos
{
    public class QuizDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = default!;
        public string Description { get; set; } = default!;
        public string Difficulty { get; set; } = default!;
        public int TimeLimit { get; set; }
        public string Category { get; set; } = default!;

        public int QuestionCount { get; set; }
    }
}
