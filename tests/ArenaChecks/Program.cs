global using Microsoft.Extensions.Configuration;
using BE.Arena;
using System.Text.Json;

static void Check(bool pass, string message) { if (!pass) throw new Exception(message); Console.WriteLine("PASS " + message); }
static JsonElement J(object value) => JsonSerializer.SerializeToElement(value, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
static void Reject(Action action, string message) { try { action(); } catch (Exception e) when (e is InvalidOperationException or UnauthorizedAccessException) { Check(true, message); return; } throw new Exception(message); }

foreach (var chain in QuestionBank.Chains)
{
    Check(chain.Length == 5, "Chain has five questions");
    for (int i = 1; i < 5; i++) Check(QuestionBank.Normalize(chain[i - 1].Answers[0])[^1] == QuestionBank.Normalize(chain[i].Answers[0])[0], "Last letter matches next initial");
}
Check(QuestionBank.Normalize(" ĐorĐe, ČĆŠŽ! ") == "djordjeccsz", "Diacritics, punctuation and case normalization");
var clock = new TestClock();
var directory = Path.Combine(Path.GetTempPath(), "pugs-checks-" + Guid.NewGuid().ToString("N"));
var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Arena:DataPath"] = directory }).Build();
var service = new ArenaService(clock, config);
var host = J(service.Create("Domaćin", 20)); var code = host.GetProperty("code").GetString()!; var token = host.GetProperty("token").GetString()!;
var guest = J(service.Join(code, "Igrač")); var guestToken = guest.GetProperty("token").GetString()!;
Reject(() => service.Join(code, "igrač"), "Duplicate nickname rejected");
Reject(() => service.State(code, "fake"), "Invalid token rejected");
Reject(() => service.Start(code, guestToken), "Guest cannot start");
Reject(() => service.Answer(code, token, 0, "anything"), "No pre-game scoring");
Reject(() => service.Start(code, token), "Missing clips block start");
var categories = QuestionBank.Categories.Keys.Take(4).ToArray();
Reject(() => service.Vote(code, token, new[] { "Sport", "Sport", "Sport", "Sport" }), "Duplicate categories rejected");
service.Vote(code, token, categories); service.Vote(code, guestToken, categories);
service.With(code, token, (r, p) => { for (int i = 0; i < 5; i++) r.Music.Add(new ArenaQuestion("Pjesma?", new[] { "Naslov " + i }, "Muzičko finale", "clip.mp3", "Izvođač")); return true; });
service.Start(code, token); Reject(() => service.Start(code, token), "Double start rejected");
clock.Add(4);
var first = J(service.State(code, guestToken));
Check(first.GetProperty("answer").ValueKind == JsonValueKind.Null, "Correct answer hidden during question");
Check(!first.ToString().Contains("clip.mp3"), "Future clips hidden");
int expected = 0;
for (int i = 0; i < 30; i++)
{
    string correct = service.With(code, token, (r, p) => r.Questions[i].Answers[0]);
    service.Answer(code, guestToken, i, correct); expected += 150;
    Reject(() => service.Answer(code, guestToken, i, correct), "Duplicate answer rejected " + i);
    clock.Add(20); var reveal = J(service.State(code, guestToken));
    Check(reveal.GetProperty("phase").GetString() == "reveal", "Reveal phase " + i);
    Check(reveal.GetProperty("points").GetInt32() == 150, "Server computes points " + i);
    Reject(() => service.Answer(code, token, i, correct), "Late answer rejected " + i);
    clock.Add(5);
    service = new ArenaService(clock, config); // Simulate restart every round.
    var restored = J(service.State(code, guestToken));
    Check(restored.GetProperty("me").GetString() == "Igrač", "Token and player survive restart " + i);
}
var final = J(service.State(code, guestToken));
Check(final.GetProperty("phase").GetString() == "finished", "Exactly 30 questions then finish");
Check(final.GetProperty("players")[0].GetProperty("score").GetInt32() == expected, "Final leaderboard and scores survive restarts");
Console.WriteLine("All arena checks passed. Temporary test data: " + directory);

class TestClock : TimeProvider
{
    DateTimeOffset now = DateTimeOffset.UtcNow;
    public override DateTimeOffset GetUtcNow() => now;
    public void Add(int seconds) => now = now.AddSeconds(seconds);
}
