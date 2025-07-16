namespace BE.Models
{
    public class User
    {
        public int Id {  get; set; }
        public string Username { get; set; } = default!;
        public string Email { get; set; } = default!;
        public string PasswordHash { get; set; } = default!;
        public string? ImageUrl { get; set; }

        public string Role { get; set; } = "Korisnik";  // default je "Korisnik"
    }
}
