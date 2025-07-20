namespace BE.Dtos.Results
{
    public class AnswerDto
    {
        public int QuestionId { get; set; }
        public List<int> SelectedOptionIds { get; set; } = new(); // Za single/multiple
        public string? UserAnswer { get; set; } // Za fill
    }

}
