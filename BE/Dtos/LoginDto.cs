namespace BE.Dtos
{
    public class LoginDto
    {
        public string UsernameOrEmail { get; set; } = default!;
        public string Password { get; set; } = default!;
    }
}
