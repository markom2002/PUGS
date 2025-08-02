namespace BE.Dtos.Leaderboard
{
    public class LeaderboardEntryDto
    {
        public int Position { get; set; }
        public string UserName {  get; set; } = string.Empty;
        public int Points { get; set; }
        public DateTime CreatedAt { get; set; }
    }

}
