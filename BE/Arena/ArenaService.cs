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
    public Dictionary<int, int> ResponseTimesMs { get; } = new();
    public Dictionary<int, (string Text, int Points)> Answers { get; } = new();
}
public class ArenaRoom
{
    public bool Offline { get; set; }
    public bool HostParticipates { get; set; }
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
    readonly Dictionary<string,int> QuestionUses = new();
    static int Duration(ArenaRoom r) => r.Seconds + (r.Index>=25?5:0);
    readonly TimeProvider clock;
    readonly string? savePath;
    readonly string? codesPath;
    readonly HashSet<string> usedCodes = new();
    bool codesDirty;
    static readonly JsonSerializerOptions json = new() { IncludeFields = true, PreferredObjectCreationHandling = JsonObjectCreationHandling.Populate };
    public ArenaService(TimeProvider clock, IConfiguration config)
    {
        this.clock = clock;
        if (config["Arena:Ephemeral"] != "true")
        {
            var directory = config["Arena:DataPath"] ?? Path.Combine(Directory.GetCurrentDirectory(), "arena-data");
            Directory.CreateDirectory(directory); savePath = Path.Combine(directory, "rooms.json");
            if(File.Exists(savePath+".usage")) foreach(var entry in JsonSerializer.Deserialize<Dictionary<string,int>>(File.ReadAllText(savePath+".usage"))!)QuestionUses[entry.Key]=entry.Value;
            codesPath = Path.Combine(directory, "used-room-codes.json");
            if (File.Exists(codesPath)) foreach (var code in JsonSerializer.Deserialize<string[]>(File.ReadAllText(codesPath)) ?? Array.Empty<string>()) usedCodes.Add(code);
            if (File.Exists(savePath))
                foreach (var r in JsonSerializer.Deserialize<List<ArenaRoom>>(File.ReadAllText(savePath), json) ?? new())
                    { if (usedCodes.Add(r.Code)) codesDirty = true; if (clock.GetUtcNow() - r.Touched < TimeSpan.FromHours(3)) rooms[r.Code] = r; }
        }
    }
    void Save()
    {
        if (savePath == null) return;
        if(codesDirty&&codesPath!=null){
            File.WriteAllText(codesPath+".tmp",JsonSerializer.Serialize(usedCodes));
            File.Move(codesPath+".tmp",codesPath,true);codesDirty=false;
        }
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
    public object Create(string name, int seconds, bool offline = false)
    {
        lock (gate)
        {
            foreach (var key in rooms.Where(x => clock.GetUtcNow() - x.Value.Touched > TimeSpan.FromHours(3)).Select(x => x.Key).ToArray()) rooms.Remove(key);
            if (rooms.Count >= 500) throw new InvalidOperationException("Server je pun. Pokušaj kasnije.");
            if (usedCodes.Count >= 900000) throw new InvalidOperationException("Sve oznake soba su iskorišćene. Potrebno je proširiti PIN prostor.");
            string code;
            do { code = RandomNumberGenerator.GetInt32(100000, 1000000).ToString(); } while (usedCodes.Contains(code));
            usedCodes.Add(code); codesDirty = true;
            var room = new ArenaRoom { Code = code, Offline = offline, Seconds = Math.Clamp(seconds, 10, 20) };
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
    public object ResetLobby(string code,string token)=>With(code,token,(r,p)=>{
        Host(r,p);
        if(r.Phase!="lobby")throw new InvalidOperationException("Čekaonica se može isprazniti samo prije početka partije.");
        int removed=r.Players.Count-1;r.Players.RemoveRange(1,removed);
        p.Votes=Array.Empty<string>();p.Score=0;p.Correct=0;p.Answers.Clear();p.ResponseTimesMs.Clear();
        r.Music.Clear();r.Questions=Array.Empty<ArenaQuestion>();r.Selected=Array.Empty<string>();r.Index=-1;
        return new {ok=true,removed};
    });
    public object Leave(string code,string token)=>With(code,token,(r,p)=>{
        if(r.Phase=="lobby"){
            if(r.Players[0]==p)rooms.Remove(r.Code);
            else r.Players.Remove(p);
        }
        return new {ok=true};
    });
    public static void Host(ArenaRoom room, ArenaPlayer player)
    { if (room.Players[0] != player) throw new UnauthorizedAccessException("Samo domaćin upravlja partijom."); }
    public static bool IsCompetitor(ArenaRoom room, ArenaPlayer player) => room.Players[0] != player || room.HostParticipates;
    public object Participation(string code, string token, bool participates) => With(code, token, (r,p) => {
        Host(r,p);
        if(r.Phase != "lobby") throw new InvalidOperationException("Ulogu biraš prije početka partije.");
        r.HostParticipates = participates;
        p.Votes = Array.Empty<string>();
        return new { ok = true };
    });
    public object Vote(string code, string token, string[] votes) => With(code, token, (r, p) =>
    {
        if (!IsCompetitor(r,p)) throw new InvalidOperationException("Voditelj ne bira oblasti. Uključi učešće u igri.");
        if (r.Phase != "lobby" || votes.Length != 4 || votes.Distinct().Count() != 4 || votes.Any(v => !QuestionBank.Categories.ContainsKey(v))) throw new InvalidOperationException("Izaberi četiri različite oblasti prije početka.");
        p.Votes = votes; return new { ok = true };
    });
    public object Start(string code, string token) => With(code, token, (r, p) =>
    {
        Host(r, p);
        if (r.Phase != "lobby") throw new InvalidOperationException("Partija je već počela.");
        if (r.Players.Count < 2) throw new InvalidOperationException("Pozovi bar jednog igrača. Domaćin vodi partiju van konkurencije.");
        if (r.Music.Count != 5) throw new InvalidOperationException("Muzička runda nije automatski pripremljena. Provjeri da je pokrenuta najnovija verzija backenda.");
        if (r.Players.Where(x => IsCompetitor(r,x)).Any(x => x.Votes.Length != 4)) throw new InvalidOperationException("Sačekaj da svi igrači izaberu četiri oblasti.");
        r.Selected = QuestionBank.Categories.Keys.OrderByDescending(c => r.Players.Count(x => IsCompetitor(r,x) && x.Votes.Contains(c))).ThenBy(_ => Random.Shared.Next()).Take(4).ToArray();
        var chain=QuestionBank.NewChain(QuestionUses);
        r.Questions = chain.Concat(r.Selected.SelectMany(c => QuestionBank.Categories[c].Where(q=>!chain.Any(ch=>QuestionBank.Normalize(ch.Text)==QuestionBank.Normalize(q.Text))).OrderBy(q => QuestionUses.GetValueOrDefault(QuestionBank.Normalize(q.Text))).ThenBy(_ => Random.Shared.Next()).Take(5))).Concat(r.Music.OrderBy(_ => Random.Shared.Next())).ToArray();
        foreach(var q in r.Questions.Take(25)) { var key=QuestionBank.Normalize(q.Text);QuestionUses[key]=QuestionUses.GetValueOrDefault(key)+1; }
        if(savePath!=null){File.WriteAllText(savePath+".usage.tmp",JsonSerializer.Serialize(QuestionUses));File.Move(savePath+".usage.tmp",savePath+".usage",true);}
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
            else { r.Index++; r.Phase = "question"; r.Deadline = r.Deadline.AddSeconds(Duration(r)); }
        }
    }
    public object Answer(string code, string token, int index, string answer) => With(code, token, (r, p) =>
    {
        if (!IsCompetitor(r,p)) throw new InvalidOperationException("Domaćin vodi partiju van konkurencije.");
        if (r.Phase != "question" || index != r.Index) throw new InvalidOperationException("Vrijeme za ovo pitanje je isteklo.");
        if (p.Answers.ContainsKey(index)) throw new InvalidOperationException("Odgovor je već poslat.");
        if (string.IsNullOrWhiteSpace(answer) || answer.Length > 160) throw new InvalidOperationException("Unesi odgovor do 160 znakova.");
        bool correct = r.Questions[index].Answers.Any(a => QuestionBank.Normalize(a) == QuestionBank.Normalize(answer));
        int points = correct ? 100 + (int)Math.Clamp((r.Deadline - clock.GetUtcNow()).TotalSeconds / Duration(r) * 50, 0, 50) : r.Index>=25 && !string.IsNullOrWhiteSpace(r.Questions[index].Artist) && QuestionBank.Normalize(r.Questions[index].Artist!)==QuestionBank.Normalize(answer) ? 50 : 0;
        p.ResponseTimesMs[index] = (int)Math.Clamp((clock.GetUtcNow() - r.Deadline.AddSeconds(-Duration(r))).TotalMilliseconds, 0, Duration(r) * 1000);
        p.Answers[index] = (answer.Trim(), points); p.Score += points; if (correct) p.Correct++;
        // Correctness is returned only during reveal, never while opponents can answer.
        return new { ok = true };
    });
    public record VictorySong(int Index, string Title, string? Artist, int ResponseMs, string Player);
    public static VictorySong? GetVictorySong(ArenaRoom room)
    {
        if(room.Phase!="finished")return null;
        var players=room.Players.Where(p=>IsCompetitor(room,p)).ToArray();if(players.Length==0)return null;
        int bestScore=players.Max(p=>p.Score);
        return players.Where(p=>p.Score==bestScore).SelectMany(p=>p.ResponseTimesMs
            .Where(kv=>kv.Key>=25&&kv.Key<room.Questions.Length&&room.Questions[kv.Key].AudioUrl!=null&&p.Answers.TryGetValue(kv.Key,out var a)&&a.Points>0&&room.Questions[kv.Key].Answers.Any(title=>QuestionBank.Normalize(title)==QuestionBank.Normalize(a.Text)))
            .Select(kv=>new VictorySong(kv.Key,room.Questions[kv.Key].Answers[0],room.Questions[kv.Key].Artist,kv.Value,p.Name)))
            .OrderBy(s=>s.ResponseMs).ThenBy(s=>s.Index).ThenBy(s=>s.Player,StringComparer.Ordinal).FirstOrDefault();
    }    public object State(string code, string token) => With(code, token, (r, p) =>
    {
        var q = r.Index >= 0 ? r.Questions[r.Index] : null;
        var reveal = r.Phase == "reveal" || r.Phase == "finished";
        var canSeeCurrent = reveal || !IsCompetitor(r,p) || p.Answers.ContainsKey(r.Index);
        var competitors = r.Players.Where(x=>IsCompetitor(r,x)).ToArray();
        int PointsNow(ArenaPlayer player) => player.Answers.TryGetValue(r.Index,out var a) ? a.Points : 0;
        int VisibleScore(ArenaPlayer player) => player.Score - (!canSeeCurrent && r.Phase=="question" ? PointsNow(player) : 0);
        int PreviousScore(ArenaPlayer player) => player.Score - PointsNow(player);
        int Rank(ArenaPlayer player) => 1 + competitors.Count(other => VisibleScore(other)>VisibleScore(player));
        int PreviousRank(ArenaPlayer player) => 1 + competitors.Count(other => PreviousScore(other)>PreviousScore(player));
        double? AverageTime(ArenaPlayer player) {
            var times=player.ResponseTimesMs.Where(kv=>canSeeCurrent||kv.Key!=r.Index).Select(kv=>(double)kv.Value).ToArray();
            return times.Length==0?null:Math.Round(times.Average());
        }
        var fastestTime = competitors.Where(x=>x.ResponseTimesMs.ContainsKey(r.Index)).Select(x=>(int?)x.ResponseTimesMs[r.Index]).Min();
        p.Answers.TryGetValue(r.Index, out var mine);
        return new {
            r.Code, r.Phase, r.Index, seconds=Duration(r), r.Offline, serverNow = clock.GetUtcNow(), r.Deadline,
            isHost = r.Players[0] == p, hostParticipates = r.HostParticipates, isPlaying = IsCompetitor(r,p), me = p.Name, votes = p.Votes, r.Selected,
            categories = QuestionBank.Categories.Keys, musicCount = r.Music.Count,
            music = r.Players[0] == p && !r.HostParticipates && r.Phase == "lobby" ? r.Music.Select(m => new { title = m.Answers[0], m.Artist }).ToArray() : null,
            victory = r.Phase=="finished" ? new { winnerNames=competitors.Where(x=>x.Score==competitors.Max(y=>y.Score)).Select(x=>x.Name).ToArray(), score=competitors.Length==0?0:competitors.Max(x=>x.Score), song=GetVictorySong(r) } : null,
            rankingLive = canSeeCurrent,
            answeredCount = competitors.Count(x=>x.Answers.ContainsKey(r.Index)), competitorCount = competitors.Length,
            players = r.Players.Where(x=>r.Phase!="finished"||IsCompetitor(r,x)).OrderBy(x=>!IsCompetitor(r,x)).ThenByDescending(VisibleScore).ThenBy(x=>AverageTime(x)??double.MaxValue).ThenBy(x=>x.Name).Select(x=>new {
                x.Name, host=x==r.Players[0], participating=IsCompetitor(r,x), score=VisibleScore(x),
                rank=!IsCompetitor(r,x)?(int?)null:Rank(x), rankChange=!IsCompetitor(r,x)?0:PreviousRank(x)-Rank(x),
                correct=x.Correct-(!canSeeCurrent&&r.Phase=="question"&&PointsNow(x)>=100?1:0),
                voted=x.Votes.Length==4, answered=x.Answers.ContainsKey(r.Index),
                responseMs=x.ResponseTimesMs.TryGetValue(r.Index,out var ms)?(int?)ms:null,
                averageMs=AverageTime(x), questionPoints=canSeeCurrent?PointsNow(x):(int?)null,
                fastest=IsCompetitor(r,x)&&fastestTime!=null&&x.ResponseTimesMs.TryGetValue(r.Index,out var time)&&time==fastestTime
            }),
            question = q == null ? null : new { q.Text, q.Category, q.AudioUrl },
            answer = reveal ? q?.Answers[0] : null, artist = reveal ? q?.Artist : null,
            musicSourceUrl = reveal && q?.AudioUrl?.StartsWith("deezer:") == true ? "https://www.deezer.com/track/" + q.AudioUrl[7..] : null,
            submitted = p.Answers.ContainsKey(r.Index), myAnswer = mine.Text, points = reveal ? mine.Points : (int?)null
        };
    }, persist: false);
}
