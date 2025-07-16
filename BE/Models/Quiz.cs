namespace BE.Models
{
    public class Quiz
    {
        public int Id { get; set; }
        public string Title { get; set; } = default!;
        public string Description { get; set; } = default!;
        public string Category { get; set; } = default!;
        public string Difficulty { get; set; } = default!; // lako, srednje, teško
        public int TimeLimit { get; set; } // u sekundama

        public ICollection<Question> Questions { get; set; } = new List<Question>();
    }
}
