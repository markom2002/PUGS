using Microsoft.AspNetCore.Mvc;
using BE.Services.Interfaces;
using BE.Dtos;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IUserService _userService;

        public AuthController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpPost("register")]
        public async Task<ActionResult<UserDto>> Register(RegisterDto dto)
        {
            try
            {
                return await _userService.RegisterAsync(dto);
            }
            catch (Exception ex)
            {

                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("login")]
        public async Task<ActionResult<UserDto>> Login(LoginDto dto)
        {
            try
            {
                return await _userService.LoginAsync(dto);
            }
            catch (Exception ex)
            {

                return Unauthorized(new { message = ex.Message });
            }

        }

        [HttpGet("test")]
        public ActionResult<string> Test()
        {
            return "Auth controller radi!";
        }

        // Novi endpoint za proveru ko je ulogovan i koje role ima
        [Authorize]
        [HttpGet("whoami")]
        public ActionResult GetCurrentUser()
        {
            var username = User.Identity?.Name ?? "anonymous";
            var roles = User.Claims
                .Where(c => c.Type == ClaimTypes.Role)
                .Select(c => c.Value)
                .ToList();

            return Ok(new
            {
                Username = username,
                Roles = roles
            });
        }



    }
}
