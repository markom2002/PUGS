namespace BE.Dtos
{
    public class LeaderboardResultDto
    {
        public int Position { get; set; }
        public string Username { get; set; } = string.Empty;
        public int Score { get; set; }   // bodovi/procenat
        public DateTime AchievedAt { get; set; }
    }
}
