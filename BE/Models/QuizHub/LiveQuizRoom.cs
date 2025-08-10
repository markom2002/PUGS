namespace BE.Models.QuizHub
{
    public class LiveQuizRoom
    {
        public int Id { get; set; }
        public string RoomCode { get; set; } = string.Empty;
        public int QuizId { get; set; }

        public Quiz Quiz { get; set; }
        public DateTime CreatedAt { get; set; }

        public List<LiveQuizParticipant> Participants { get; set; } = new();

        public bool IsQuizStarted { get; set; } = false;


    }
}
