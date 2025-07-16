using BE.Dtos;
using BE.Models;

namespace BE.Services.Interfaces
{
    public interface IUserService
    {
        Task<UserDto> RegisterAsync(RegisterDto dto);
        Task<UserDto> LoginAsync(LoginDto dto);

    }
}
