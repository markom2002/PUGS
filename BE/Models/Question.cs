namespace BE.Models
{
    public class Question
    {
        public int Id { get; set; }
        public string Text { get; set; } = default!;
        public string Type { get; set; } = default!; // single, multiple, truefalse, text

        public int Points { get; set; }
        public int QuizId { get; set; }
        public bool AllowMultipleAnswers { get; set; }
        public Quiz Quiz { get; set; } = default!;

        public ICollection<Option> Options { get; set; } = new List<Option>();
    }
}
