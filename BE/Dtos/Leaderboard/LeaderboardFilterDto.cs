namespace BE.Dtos.Leaderboard
{
    public class LeaderboardFilterDto
    {
        public int? QuizId { get; set; }
        public string TimePeriod { get; set; } // "weekly", "monthly", "all"
    }
}

