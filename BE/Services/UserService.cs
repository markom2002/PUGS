using BE.Dtos;
using BE.Models;
using BE.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;


namespace BE.Services
{
    public class UserService : IUserService
    {
        private readonly AppContext _context;
        private readonly IConfiguration _config;


        public UserService(AppContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        public async Task<UserDto> LoginAsync(LoginDto dto)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == dto.UsernameOrEmail || u.Email == dto.UsernameOrEmail);

            if (user == null)
                throw new Exception("Invalid credentials (user not found)");

            bool valid = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);

            if (!valid)
                throw new Exception("Invalid credentials (password mismatch)");

            return new UserDto
            {
                Username = user.Username,
                Email = user.Email,
                Token = CreateToken(user)
            };
        }


        public async Task<UserDto> RegisterAsync(RegisterDto dto)
        {
            if(await _context.Users.AnyAsync(u => u.Username == dto.Username || u.Email == dto.Email))
                throw new Exception("Username or Email already exists");

            var user = new User
            {
                Username = dto.Username,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                ImageUrl = dto.ImageUrl,
                Role = "Korisnik"
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return new UserDto
            {
                Username = user.Username,
                Email = user.Email,
                Token = CreateToken(user)
            };
               
        }

        private string CreateToken(User user) 
        {
            var claims = new List<Claim>
            {
                new Claim("id", user.Id.ToString()),  // VAŽNO: dodaj ID korisnika
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role)  // "Admin" ili "Korisnik"
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);
            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.Now.AddHours(2),
                signingCredentials: creds
            );
            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
