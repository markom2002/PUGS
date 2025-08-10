namespace BE.Dtos.QuizHub
{
    public class SubmitAnswerDto
    {
        public string RoomCode { get; set; } = string.Empty;

        public int UserId { get; set; }
        public int QuestionId { get; set; }
        public List<int> SelectedOptionIds { get; set; } = new();
        public int DurationMs { get; set; }
        
        public string? TextAnswer { get; set; }

    }

}
