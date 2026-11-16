using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;
namespace BE.Arena;

[ApiController, Route("api/arena")]
public class ArenaController(ArenaService arena, IWebHostEnvironment env, IConfiguration config, MusicLibrary music) : ControllerBase
{
    string AudioDirectory => config["Arena:DataPath"] ?? Path.Combine(env.ContentRootPath, "arena-data");
    public record CreateRequest(string Name, int Seconds = 20, bool Offline = false);
    public record JoinRequest(string Name);
    public record ParticipationRequest(bool Participates);
    public record VoteRequest(string[] Categories);
    public record AnswerRequest(int Index, string Answer);
    string Token => Request.Headers["X-Player-Token"].ToString();
    IActionResult Run(Func<object> action)
    {
        try { return Ok(action()); }
        catch (UnauthorizedAccessException e) { return Unauthorized(new { error = e.Message }); }
        catch (InvalidOperationException e) { return BadRequest(new { error = e.Message }); }
    }
    [EnableRateLimiting("arena-create"), HttpPost("rooms")] public IActionResult Create(CreateRequest req) => Run(() => arena.Create(req.Name, req.Seconds, req.Offline));
    [EnableRateLimiting("arena-join"), HttpPost("rooms/{code}/join")] public IActionResult Join(string code, JoinRequest req) => Run(() => arena.Join(code, req.Name));
    [HttpGet("rooms/{code}")] public IActionResult State(string code) => Run(() => arena.State(code, Token));
    [HttpPost("rooms/{code}/reset-lobby")] public IActionResult ResetLobby(string code) => Run(() => arena.ResetLobby(code,Token));
    [HttpPost("rooms/{code}/leave")] public IActionResult Leave(string code) => Run(() => arena.Leave(code,Token));
    [HttpPost("rooms/{code}/participation")] public IActionResult Participation(string code, ParticipationRequest req) => Run(() => arena.Participation(code, Token, req.Participates));
    [HttpPost("rooms/{code}/vote")] public IActionResult Vote(string code, VoteRequest req) => Run(() => arena.Vote(code, Token, req.Categories));
    [HttpGet("connection")] public IActionResult Connection([FromServices] ArenaConnectionInfo connection) => Ok(connection.Describe(Request));
    [HttpGet("music/status")] public IActionResult MusicStatus() => Ok(music.Summary());
    [EnableRateLimiting("arena-create"), HttpGet("offline-pack")]
    public async Task<IActionResult> OfflinePack(CancellationToken ct) {
        try {
            var selected=await music.PickAsync(ct,true);
            var songs=new List<object>();
            foreach(var q in selected) songs.Add(new {id=q.AudioUrl,title=q.Answers[0],answers=q.Answers,artist=q.Artist,audio=Convert.ToBase64String(await music.AudioAsync(long.Parse(q.AudioUrl![7..]),ct))});
            return Ok(new {questions=QuestionBank.Categories.Values.SelectMany(q=>q),songs});
        }catch(InvalidOperationException e){return BadRequest(new{error=e.Message});}
    }
    [HttpPost("rooms/{code}/start")]
    public async Task<IActionResult> Start(string code, CancellationToken ct)
    {
        try {
            var needsMusic = arena.With(code,Token,(r,p) => { ArenaService.Host(r,p); if(r.Phase!="lobby") throw new InvalidOperationException("Partija je već počela."); return r.Music.Count!=5; },persist:false);
            if(needsMusic) {
                var selected=await music.PickAsync(ct,arena.With(code,Token,(r,p)=>r.Offline,persist:false));
                arena.With(code,Token,(r,p)=> { ArenaService.Host(r,p); if(r.Phase!="lobby") throw new InvalidOperationException("Partija je već počela."); r.Music.Clear(); r.Music.AddRange(selected); return true; });
            }
            return Run(()=>arena.Start(code,Token));
        } catch(UnauthorizedAccessException e) { return Unauthorized(new {error=e.Message}); }
          catch(InvalidOperationException e) { return BadRequest(new {error=e.Message}); }
          catch(Exception e) when(e is HttpRequestException or TaskCanceledException) { return StatusCode(503,new {error="Muzički servis trenutno nije dostupan. Pokušaj ponovo."}); }
    }
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
    public async Task<IActionResult> Audio(string code, int index, CancellationToken ct)
    {
        try {
            string id=arena.With(code,Token,(r,p)=> {
                if(r.Index!=index||r.Phase!="question"||r.Questions[index].AudioUrl is not string audio)throw new InvalidOperationException("Isečak trenutno nije dostupan.");return audio;
            },persist:false);
            return await StreamClipAsync(id,ct);
        }catch(Exception e)when(e is InvalidOperationException or UnauthorizedAccessException){return NotFound();}
         catch(Exception e)when(e is HttpRequestException or TaskCanceledException){return StatusCode(503);}
    }
    [HttpGet("rooms/{code}/victory-audio")]
    public async Task<IActionResult> VictoryAudio(string code,CancellationToken ct)
    {
        try {
            var id=arena.With(code,Token,(r,p)=> {
                var song=ArenaService.GetVictorySong(r)??throw new InvalidOperationException("Nema pobjedničke pjesme.");
                return r.Questions[song.Index].AudioUrl!;
            },persist:false);
            return await StreamClipAsync(id,ct);
        }catch(Exception e)when(e is InvalidOperationException or UnauthorizedAccessException){return NotFound();}
         catch(Exception e)when(e is HttpRequestException or TaskCanceledException){return StatusCode(503);}
    }
    async Task<IActionResult> StreamClipAsync(string id,CancellationToken ct)
    {
        Response.Headers.CacheControl="no-store";
        if(id.StartsWith("deezer:")&&long.TryParse(id[7..],out var trackId))return File(await music.AudioAsync(trackId,ct),"audio/mpeg");
        var mime=Path.GetExtension(id) switch {".mp3"=>"audio/mpeg",".wav"=>"audio/wav",".ogg"=>"audio/ogg",_=>"audio/mp4"};
        return PhysicalFile(Path.Combine(AudioDirectory,id),mime,enableRangeProcessing:true);
    }
}