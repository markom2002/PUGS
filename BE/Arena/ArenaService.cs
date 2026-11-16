using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
namespace BE.Arena;

public class ArenaPlayer
{
    public string Token { get; set; } = Convert.ToHexString(RandomNumberGenerator.GetBytes(24));
    public string Name { get; set; } = "";
    public int Score { get; set; }
    public int Correct { get; set; }
    public string[] Votes { get; set; } = Array.Empty<string>();
    public Dictionary<int, (string Text, int Points)> Answers { get; } = new();
}
public class ArenaRoom
{
    public string Code { get; set; } = "";
    public List<ArenaPlayer> Players { get; } = new();
    public List<ArenaQuestion> Music { get; } = new();
    public ArenaQuestion[] Questions { get; set; } = Array.Empty<ArenaQuestion>();
    public string[] Selected { get; set; } = Array.Empty<string>();
    public string Phase { get; set; } = "lobby";
    public int Index { get; set; } = -1;
    public int Seconds { get; set; } = 20;
    public DateTimeOffset Deadline { get; set; }
    public DateTimeOffset Touched { get; set; } = DateTimeOffset.UtcNow;
}
public class ArenaService
{
    readonly TimeProvider clock;
    readonly string? savePath;
    static readonly JsonSerializerOptions json = new() { IncludeFields = true, PreferredObjectCreationHandling = JsonObjectCreationHandling.Populate };
    public ArenaService(TimeProvider clock, IConfiguration config)
    {
        this.clock = clock;
        if (config["Arena:Ephemeral"] != "true")
        {
            var directory = config["Arena:DataPath"] ?? Path.Combine(Directory.GetCurrentDirectory(), "arena-data");
            Directory.CreateDirectory(directory); savePath = Path.Combine(directory, "rooms.json");
            if (File.Exists(savePath))
                foreach (var r in JsonSerializer.Deserialize<List<ArenaRoom>>(File.ReadAllText(savePath), json) ?? new())
                    if (clock.GetUtcNow() - r.Touched < TimeSpan.FromHours(3)) rooms[r.Code] = r;
        }
    }
    void Save()
    {
        if (savePath == null) return;
        File.WriteAllText(savePath + ".tmp", JsonSerializer.Serialize(rooms.Values, json));
        File.Move(savePath + ".tmp", savePath, true);
    }
    // All mutations and snapshots share one lock; no double scoring or timer races.
    readonly object gate = new();
    readonly Dictionary<string, ArenaRoom> rooms = new();
    public T With<T>(string code, string token, Func<ArenaRoom, ArenaPlayer, T> action, bool persist = true)
    {
        lock (gate)
        {
            if (!rooms.TryGetValue(code.ToUpperInvariant(), out var room)) throw new InvalidOperationException("Soba nije pronađena ili je istekla.");
            var player = room.Players.Find(p => p.Token == token) ?? throw new UnauthorizedAccessException("Ponovo se pridruži sobi.");
            var previousPhase = room.Phase; var previousIndex = room.Index;
            Advance(room);
            room.Touched = clock.GetUtcNow();
            var result = action(room, player);
            if (persist || room.Phase != previousPhase || room.Index != previousIndex) Save();
            return result;
        }
    }
    public object Create(string name, int seconds)
    {
        lock (gate)
        {
            foreach (var key in rooms.Where(x => clock.GetUtcNow() - x.Value.Touched > TimeSpan.FromHours(3)).Select(x => x.Key).ToArray()) rooms.Remove(key);
            if (rooms.Count >= 500) throw new InvalidOperationException("Server je pun. Pokušaj kasnije.");
            string code;
            do { code = RandomNumberGenerator.GetInt32(100000, 1000000).ToString(); } while (rooms.ContainsKey(code));
            var room = new ArenaRoom { Code = code, Seconds = Math.Clamp(seconds, 10, 20) };
            var player = new ArenaPlayer { Name = Name(name) };
            room.Touched = clock.GetUtcNow(); room.Players.Add(player); rooms.Add(code, room); Save();
            return new { code, token = player.Token };
        }
    }
    static string Name(string name) => string.IsNullOrWhiteSpace(name) || name.Trim().Length > 24 ? throw new InvalidOperationException("Nadimak mora imati 1–24 znaka.") : name.Trim();
    public object Join(string code, string name)
    {
        lock (gate)
        {
            if (!rooms.TryGetValue(code.Trim(), out var room)) throw new InvalidOperationException("Nema sobe sa tim PIN-om.");
            if (room.Phase != "lobby") throw new InvalidOperationException("Partija je već počela.");
            if (room.Players.Count >= 32) throw new InvalidOperationException("Soba ima maksimalnih 32 igrača.");
            name = Name(name);
            if (room.Players.Any(p => p.Name.Equals(name, StringComparison.OrdinalIgnoreCase))) throw new InvalidOperationException("Nadimak je zauzet.");
            var player = new ArenaPlayer { Name = name }; room.Players.Add(player); room.Touched = clock.GetUtcNow(); Save();
            return new { code = room.Code, token = player.Token };
        }
    }
    public static void Host(ArenaRoom room, ArenaPlayer player)
    { if (room.Players[0] != player) throw new UnauthorizedAccessException("Samo domaćin upravlja partijom."); }
    public object Vote(string code, string token, string[] votes) => With(code, token, (r, p) =>
    {
        if (r.Phase != "lobby" || votes.Length != 4 || votes.Distinct().Count() != 4 || votes.Any(v => !QuestionBank.Categories.ContainsKey(v))) throw new InvalidOperationException("Izaberi četiri različite oblasti prije početka.");
        p.Votes = votes; return new { ok = true };
    });
    public object Start(string code, string token) => With(code, token, (r, p) =>
    {
        Host(r, p);
        if (r.Phase != "lobby") throw new InvalidOperationException("Partija je već počela.");
        if (r.Players.Count < 2) throw new InvalidOperationException("Pozovi bar jednog igrača. Domaćin vodi partiju van konkurencije.");
        if (r.Music.Count != 5) throw new InvalidOperationException("Dodaj pet audio isečaka za završnu rundu.");
        if (r.Players.Any(x => x.Votes.Length != 4)) throw new InvalidOperationException("Sačekaj da svi igrači izaberu četiri oblasti.");
        r.Selected = QuestionBank.Categories.Keys.OrderByDescending(c => r.Players.Count(x => x.Votes.Contains(c))).ThenBy(_ => Random.Shared.Next()).Take(4).ToArray();
        r.Questions = QuestionBank.Chains[Random.Shared.Next(QuestionBank.Chains.Length)].Concat(r.Selected.SelectMany(c => QuestionBank.Categories[c].OrderBy(_ => Random.Shared.Next()))).Concat(r.Music.OrderBy(_ => Random.Shared.Next())).ToArray();
        r.Phase = "countdown"; r.Deadline = clock.GetUtcNow().AddSeconds(4);
        return new { ok = true };
    });
    void Advance(ArenaRoom r)
    {
        var now = clock.GetUtcNow();
        while (r.Phase != "lobby" && r.Phase != "finished" && now >= r.Deadline)
        {
            if (r.Phase == "question") { r.Phase = "reveal"; r.Deadline = r.Deadline.AddSeconds(5); }
            else if (r.Index >= 29) r.Phase = "finished";
            else { r.Index++; r.Phase = "question"; r.Deadline = r.Deadline.AddSeconds(r.Seconds); }
        }
    }
    public object Answer(string code, string token, int index, string answer) => With(code, token, (r, p) =>
    {
        if (r.Players[0] == p) throw new InvalidOperationException("Domaćin vodi partiju van konkurencije.");
        if (r.Phase != "question" || index != r.Index) throw new InvalidOperationException("Vrijeme za ovo pitanje je isteklo.");
        if (p.Answers.ContainsKey(index)) throw new InvalidOperationException("Odgovor je već poslat.");
        if (string.IsNullOrWhiteSpace(answer) || answer.Length > 160) throw new InvalidOperationException("Unesi odgovor do 160 znakova.");
        bool correct = r.Questions[index].Answers.Any(a => QuestionBank.Normalize(a) == QuestionBank.Normalize(answer));
        int points = correct ? 100 + (int)Math.Clamp((r.Deadline - clock.GetUtcNow()).TotalSeconds / r.Seconds * 50, 0, 50) : 0;
        p.Answers[index] = (answer.Trim(), points); p.Score += points; if (correct) p.Correct++;
        // Correctness is returned only during reveal, never while opponents can answer.
        return new { ok = true };
    });
    public object State(string code, string token) => With(code, token, (r, p) =>
    {
        var q = r.Index >= 0 ? r.Questions[r.Index] : null;
        var reveal = r.Phase == "reveal" || r.Phase == "finished";
        p.Answers.TryGetValue(r.Index, out var mine);
        return new {
            r.Code, r.Phase, r.Index, r.Seconds, serverNow = clock.GetUtcNow(), r.Deadline,
            isHost = r.Players[0] == p, me = p.Name, votes = p.Votes, r.Selected,
            categories = QuestionBank.Categories.Keys, musicCount = r.Music.Count,
            music = r.Players[0] == p && r.Phase == "lobby" ? r.Music.Select(m => new { title = m.Answers[0], m.Artist }).ToArray() : null,
            players = r.Players.Where(x => r.Phase != "finished" || x != r.Players[0]).OrderByDescending(x => reveal ? x.Score : 0).ThenBy(x => x.Name).Select(x => new { x.Name, host = x == r.Players[0], score = reveal || r.Phase == "lobby" ? x.Score : (int?)null, correct = reveal ? x.Correct : (int?)null, voted = x.Votes.Length == 4, answered = x.Answers.ContainsKey(r.Index) }),
            question = q == null ? null : new { q.Text, q.Category, q.AudioUrl, initial = r.Index < 5 ? q.Answers[0][..1] : null },
            answer = reveal ? q?.Answers[0] : null, artist = reveal ? q?.Artist : null,
            submitted = p.Answers.ContainsKey(r.Index), myAnswer = mine.Text, points = reveal ? mine.Points : (int?)null
        };
    }, persist: false);
}
