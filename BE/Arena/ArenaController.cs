using Microsoft.AspNetCore.Mvc;
namespace BE.Arena;

[ApiController, Route("api/arena")]
public class ArenaController(ArenaService arena, IWebHostEnvironment env, IConfiguration config) : ControllerBase
{
    string AudioDirectory => config["Arena:DataPath"] ?? Path.Combine(env.ContentRootPath, "arena-data");
    public record CreateRequest(string Name, int Seconds = 20);
    public record JoinRequest(string Name);
    public record VoteRequest(string[] Categories);
    public record AnswerRequest(int Index, string Answer);
    string Token => Request.Headers["X-Player-Token"].ToString();
    IActionResult Run(Func<object> action)
    {
        try { return Ok(action()); }
        catch (UnauthorizedAccessException e) { return Unauthorized(new { error = e.Message }); }
        catch (InvalidOperationException e) { return BadRequest(new { error = e.Message }); }
    }
    [HttpPost("rooms")] public IActionResult Create(CreateRequest req) => Run(() => arena.Create(req.Name, req.Seconds));
    [HttpPost("rooms/{code}/join")] public IActionResult Join(string code, JoinRequest req) => Run(() => arena.Join(code, req.Name));
    [HttpGet("rooms/{code}")] public IActionResult State(string code) => Run(() => arena.State(code, Token));
    [HttpPost("rooms/{code}/vote")] public IActionResult Vote(string code, VoteRequest req) => Run(() => arena.Vote(code, Token, req.Categories));
    [HttpPost("rooms/{code}/start")] public IActionResult Start(string code) => Run(() => arena.Start(code, Token));
    [HttpPost("rooms/{code}/answer")] public IActionResult Answer(string code, AnswerRequest req) => Run(() => arena.Answer(code, Token, req.Index, req.Answer));

    [HttpPost("rooms/{code}/music"), RequestSizeLimit(8 * 1024 * 1024)]
    public async Task<IActionResult> Music(string code, [FromForm] IFormFile file, [FromForm] string title, [FromForm] string artist)
    {
        string ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!new[] { ".mp3", ".ogg", ".wav", ".m4a" }.Contains(ext) || file.Length == 0 || file.Length > 8 * 1024 * 1024 || title.Length > 120 || string.IsNullOrWhiteSpace(title) || artist.Length > 120)
            return BadRequest(new { error = "Dodaj MP3, OGG, WAV ili M4A do 8 MB i naziv pjesme." });
        var check = Run(() => arena.With(code, Token, (r, p) => { ArenaService.Host(r, p); if (r.Phase != "lobby" || r.Music.Count >= 5) throw new InvalidOperationException("Možeš dodati pet pjesama u čekaonici."); return new { ok = true }; }));
        if (check is not OkObjectResult) return check;
        // Files stay outside wwwroot; authenticated endpoint serves only the current clip.
        var folder = AudioDirectory; Directory.CreateDirectory(folder);
        string id = Guid.NewGuid().ToString("N") + ext;
        await using (var stream = System.IO.File.Create(Path.Combine(folder, id))) await file.CopyToAsync(stream);
        var result = Run(() => arena.With(code, Token, (r, p) => {
            ArenaService.Host(r, p);
            if (r.Phase != "lobby" || r.Music.Count >= 5) throw new InvalidOperationException("Lista je već popunjena.");
            r.Music.Add(new ArenaQuestion("Koja pjesma se čuje?", title.Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries), "Muzičko finale", id, artist)); return new { ok = true };
        }));
        if (result is not OkObjectResult) System.IO.File.Delete(Path.Combine(folder, id));
        return result;
    }
    [HttpGet("rooms/{code}/audio/{index:int}")]
    public IActionResult Audio(string code, int index)
    {
        try {
            string id = arena.With(code, Token, (r, p) => {
                if (r.Index != index || r.Phase != "question" || r.Questions[index].AudioUrl is not string audio) throw new InvalidOperationException("Isečak trenutno nije dostupan.");
                return audio;
            });
            var path = Path.Combine(AudioDirectory, id);
            string mime = Path.GetExtension(id) switch { ".mp3" => "audio/mpeg", ".wav" => "audio/wav", ".ogg" => "audio/ogg", _ => "audio/mp4" };
            return PhysicalFile(path, mime, enableRangeProcessing: true);
        } catch (Exception e) when (e is InvalidOperationException or UnauthorizedAccessException) { return NotFound(); }
    }
}
