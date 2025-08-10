namespace BE.Dtos.QuizHub
{
    public class LiveQuizParticipantDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public int Score { get; set; }
        public int CorrectAnswers { get; set; }
        public double TotalTime { get; set; }

        public int BonusPoints { get; set; }
    }

}
