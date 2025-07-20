using BE.Dtos.Results;

namespace BE.Services.Interfaces
{
    public interface IResultService
    {
        Task<ResultDetailsDto> GetDetailsByIdAsync(int resultId);

    }
}
