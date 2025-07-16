using BE.Dtos;

namespace BE.Services
{
    public interface IOptionService
    {
        Task<IEnumerable<OptionDto>> GetAllAsync();
        Task<OptionDto?> GetByIdAsync(int id);
        Task<OptionDto> CreateAsync(OptionDto dto);
        Task<OptionDto?> UpdateAsync(int id, OptionDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
