namespace BE.Models.QuizHub
{
    public class LiveQuizParticipant
    {
        public int Id { get; set; }
        public int RoomId { get; set; }
        public LiveQuizRoom Room { get; set; }
        public int UserId { get; set; }
        public User User { get; set; }
        public string ConnectionId { get; set; } = string.Empty;
        public int Score { get; set; } = 0;
        public int CorrectAnswers { get; set; } = 0;
        public double TotalTime { get; set; } = 0;
    }

}
