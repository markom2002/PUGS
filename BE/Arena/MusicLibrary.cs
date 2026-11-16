using Microsoft.Data.SqlClient;
using System.Text.Json;
namespace BE.Arena;

public sealed class MusicLibrary
{
    readonly string connectionString;
    readonly string cacheDirectory;
    readonly IHttpClientFactory clients;
    static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };
    public record Song(long Id, string Title, string Artist, string SourceUrl, string[] Answers, string Genre = "Pop i rock");
    public MusicLibrary(IConfiguration config, IWebHostEnvironment env, IHttpClientFactory clients)
    {
        this.clients = clients;
        cacheDirectory=Path.Combine(config["Arena:DataPath"]??Path.Combine(env.ContentRootPath,"arena-data"),"audio-cache");Directory.CreateDirectory(cacheDirectory);
        connectionString = config.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("Nedostaje SQL Server konekcija za muzičku biblioteku.");
        using var db = Open();
        using var schema = db.CreateCommand();
        schema.CommandText = """
            IF OBJECT_ID(N'dbo.MusicTracks', N'U') IS NULL
            CREATE TABLE dbo.MusicTracks (
                Id bigint NOT NULL PRIMARY KEY,
                Title nvarchar(300) NOT NULL,
                Artist nvarchar(200) NOT NULL,
                Genre nvarchar(80) NOT NULL,
                SourceUrl nvarchar(500) NOT NULL,
                Answers nvarchar(max) NOT NULL,
                ImportedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
            );
            """;
        schema.ExecuteNonQuery();
        var songs = JsonSerializer.Deserialize<Song[]>(File.ReadAllText(Path.Combine(env.ContentRootPath,"Arena","Data","music-seed.json")),Json) ?? Array.Empty<Song>();
        using var transaction=db.BeginTransaction();
        foreach(var song in songs)
        {
            using var insert=db.CreateCommand(); insert.Transaction=transaction;
            insert.CommandText="""
                UPDATE dbo.MusicTracks SET Title=@title, Artist=@artist, Genre=@genre, SourceUrl=@url, Answers=@answers WHERE Id=@id;
                IF @@ROWCOUNT=0 INSERT INTO dbo.MusicTracks(Id,Title,Artist,Genre,SourceUrl,Answers) VALUES(@id,@title,@artist,@genre,@url,@answers);
                """;
            insert.Parameters.AddWithValue("@id",song.Id); insert.Parameters.AddWithValue("@title",song.Title);
            insert.Parameters.AddWithValue("@artist",song.Artist); insert.Parameters.AddWithValue("@genre",song.Genre??"Pop i rock");
            insert.Parameters.AddWithValue("@url",song.SourceUrl); insert.Parameters.AddWithValue("@answers",JsonSerializer.Serialize(song.Answers));
            insert.ExecuteNonQuery();
        }
        transaction.Commit();
    }
    SqlConnection Open() { var db=new SqlConnection(connectionString); db.Open(); return db; }
    public int Count { get { using var db=Open(); using var cmd=db.CreateCommand();cmd.CommandText="SELECT COUNT(*) FROM dbo.MusicTracks";return Convert.ToInt32(cmd.ExecuteScalar()); } }
    public object Summary()
    {
        var genres=new Dictionary<string,int>();
        using var db=Open();using var cmd=db.CreateCommand();cmd.CommandText="SELECT Genre,COUNT(*) FROM dbo.MusicTracks GROUP BY Genre ORDER BY Genre";
        using var reader=cmd.ExecuteReader();while(reader.Read())genres[reader.GetString(0)]=reader.GetInt32(1);
        return new {count=genres.Values.Sum(),genres,provider="Deezer",storage="SQL Server / QuizAppDB"};
    }
    // Selection is database-only: starting a room no longer waits for a music provider.
    public Task<ArenaQuestion[]> PickAsync(CancellationToken ct, bool offline=false)
    {
        ct.ThrowIfCancellationRequested();
        var songs=new List<Song>();
        using(var db=Open()){
            using var cmd=db.CreateCommand();cmd.CommandText="SELECT Id,Title,Artist,SourceUrl,Answers,Genre FROM dbo.MusicTracks ORDER BY NEWID()";
            using var reader=cmd.ExecuteReader();while(reader.Read())songs.Add(new Song(reader.GetInt64(0),reader.GetString(1),reader.GetString(2),reader.GetString(3),JsonSerializer.Deserialize<string[]>(reader.GetString(4))!,reader.GetString(5)));
        }
        if(offline)songs=songs.Where(s=>File.Exists(Path.Combine(cacheDirectory,s.Id+".mp3"))).ToList();
        if(songs.Count<5)throw new InvalidOperationException("Pripremi najmanje pet pjesama za offline igru dok imas internet.");
        var selected=new List<Song>();
        // Prefer five different genres and artists; never repeat the same song title.
        foreach(var group in songs.GroupBy(s=>s.Genre).OrderBy(_=>Random.Shared.Next())) {
            var next=group.FirstOrDefault(s=>!selected.Any(x=>x.Artist==s.Artist||QuestionBank.Normalize(x.Title)==QuestionBank.Normalize(s.Title)));
            if(next!=null)selected.Add(next);if(selected.Count==5)break;
        }
        foreach(var song in songs){if(selected.Count==5)break;if(!selected.Any(x=>x.Id==song.Id||QuestionBank.Normalize(x.Title)==QuestionBank.Normalize(song.Title)))selected.Add(song);}
        if(selected.Count!=5)throw new InvalidOperationException("Muzička biblioteka nije popunjena. Restartuj backend da uveze početni katalog.");
        return Task.FromResult(selected.Select(s=>new ArenaQuestion("Koja pjesma se čuje?",s.Answers,"Muzičko finale","deezer:"+s.Id,s.Artist)).ToArray());
    }
    async Task<string?> PreviewAsync(long id, CancellationToken ct)
    {
        var http=clients.CreateClient("music");
        using var response=await http.GetAsync("https://api.deezer.com/track/"+id,ct);
        response.EnsureSuccessStatusCode();
        using var data=await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct),cancellationToken:ct);
        if(!data.RootElement.TryGetProperty("preview",out var value)) return null;
        var url=value.GetString();
        return Uri.TryCreate(url,UriKind.Absolute,out var uri) && uri.Scheme=="https" && uri.Host.EndsWith(".dzcdn.net",StringComparison.OrdinalIgnoreCase) ? url : null;
    }
    public async Task<byte[]> AudioAsync(long id, CancellationToken ct)
    {
        using var db=Open(); using var cmd=db.CreateCommand(); cmd.CommandText="SELECT COUNT(*) FROM dbo.MusicTracks WHERE Id=@id"; cmd.Parameters.AddWithValue("@id",id);
        if(Convert.ToInt32(cmd.ExecuteScalar())!=1) throw new InvalidOperationException("Pjesma nije u biblioteci.");
        var cached=Path.Combine(cacheDirectory,id+".mp3");
        if(File.Exists(cached))return await File.ReadAllBytesAsync(cached,ct);
        var preview=await PreviewAsync(id,ct) ?? throw new InvalidOperationException("Isečak ove pjesme trenutno nije dostupan.");
        var http=clients.CreateClient("music");
        using var response=await http.GetAsync(preview,HttpCompletionOption.ResponseHeadersRead,ct); response.EnsureSuccessStatusCode();
        await using var stream=await response.Content.ReadAsStreamAsync(ct);
        using var result=new MemoryStream(); var buffer=new byte[16384]; int count;
        while((count=await stream.ReadAsync(buffer,ct))>0) { if(result.Length+count>3*1024*1024) throw new InvalidOperationException("Muzički isečak je prevelik."); await result.WriteAsync(buffer.AsMemory(0,count),ct); }
        var bytes=result.ToArray();
        if(bytes.Length>0){var temporary=cached+"."+Guid.NewGuid().ToString("N")+".tmp";await File.WriteAllBytesAsync(temporary,bytes,ct);File.Move(temporary,cached,true);}
        return bytes;
    }
}
