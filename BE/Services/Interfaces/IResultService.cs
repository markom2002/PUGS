using BE.Dtos.Leaderboard;
using BE.Dtos.Results;

namespace BE.Services.Interfaces
{
    public interface IResultService
    {
        Task<ResultDetailsDto> GetDetailsByIdAsync(int resultId);

        Task<List<UserResultDto>> GetAllUserResultsAsync();

        Task<List<LeaderboardEntryDto>> GetLeaderboardAsync(LeaderboardFilterDto filter);

        Task<List<UserProgressDto>> GetUserProgressAsync(int userId, int quizId);

    }
}
