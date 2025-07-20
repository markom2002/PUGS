namespace BE.Models
{
    public class Answer
    {
        public int Id { get; set; }
        public int ResultId { get; set; }
        public int QuestionId { get; set; }
        public bool IsCorrect { get; set; }

        public string? SelectedOptionIds { get; set; }  // Za multiple-choice
        public string? UserAnswer { get; set; }             // Za tekstualne

        public Result Result { get; set; }
        public Question Question { get; set; }
    }
}
