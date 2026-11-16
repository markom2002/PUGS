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
var observer=J(service.Join(code,"Observer")); var observerToken=observer.GetProperty("token").GetString()!; service.Vote(code,observerToken,categories);
Reject(() => service.Vote(code, guestToken, new[] { "Sport", "Sport", "Sport", "Sport" }), "Duplicate categories rejected");
service.Vote(code, guestToken, categories);
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
    var hidden = J(service.State(code, observerToken));
    Check(hidden.GetProperty("players")[0].GetProperty("score").GetInt32() == expected - 150, "Current score hidden until reveal " + i);
    var locked = J(service.State(code, guestToken));
    Check(locked.GetProperty("players")[0].GetProperty("score").GetInt32()==expected,"Submitted player sees live points "+i);
    Check(locked.GetProperty("players")[0].GetProperty("responseMs").GetInt32()==0,"Response time is server measured "+i);
    Check(locked.GetProperty("rankingLive").GetBoolean(),"Locked ranking is live "+i);
    Check(!hidden.GetProperty("rankingLive").GetBoolean(),"Unanswered player cannot infer correctness "+i);
    Check(hidden.GetProperty("players")[0].GetProperty("questionPoints").ValueKind==JsonValueKind.Null,"Current gains hidden from unanswered player "+i);
    Reject(() => service.Answer(code, guestToken, i, correct), "Duplicate answer rejected " + i);
    clock.Add(i>=25?25:20); var reveal = J(service.State(code, guestToken));
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
// Tie handling, fastest wrong answer, average time and restart persistence.
var h2=J(service.Create("Voditelj",20));var c2=h2.GetProperty("code").GetString()!;var t2=h2.GetProperty("token").GetString()!;
var a2=J(service.Join(c2,"Ana"));var ta=a2.GetProperty("token").GetString()!;
var b2=J(service.Join(c2,"Boris"));var tb=b2.GetProperty("token").GetString()!;
var c3=J(service.Join(c2,"Cedo"));var tc=c3.GetProperty("token").GetString()!;
foreach(var t in new[]{ta,tb,tc}) service.Vote(c2,t,categories);
service.With(c2,t2,(r,p)=>{for(int j=0;j<5;j++)r.Music.Add(new ArenaQuestion("Music?",new[]{"Test"},"Music","test.mp3"));return true;});
service.Start(c2,t2);clock.Add(4);service.State(c2,ta);
var answer2=service.With(c2,t2,(r,p)=>r.Questions[0].Answers[0]);
clock.Add(1);service.Answer(c2,tc,0,"wrong fixture");
clock.Add(1);service.Answer(c2,ta,0,answer2);service.Answer(c2,tb,0,answer2);
var ranked=J(service.State(c2,t2));var list=ranked.GetProperty("players");
Check(list[0].GetProperty("rank").GetInt32()==1&&list[1].GetProperty("rank").GetInt32()==1,"Tied scores share first rank");
Check(list[2].GetProperty("rank").GetInt32()==3,"Competition ranking handles tied leaders");
Check(list[2].GetProperty("fastest").GetBoolean()&&list[2].GetProperty("questionPoints").GetInt32()==0,"Fastest submission does not imply correct answer");
Check(list[0].GetProperty("responseMs").GetInt32()==2000&&list[0].GetProperty("averageMs").GetDouble()==2000,"Response and average use server clock");
Check(list[2].GetProperty("rankChange").GetInt32()==-2,"Rank movement compares previous question standings");
Check(ranked.GetProperty("answeredCount").GetInt32()==3&&ranked.GetProperty("competitorCount").GetInt32()==3,"Host excluded from response progress");
service=new ArenaService(clock,config);var resumed=J(service.State(c2,ta));
Check(resumed.GetProperty("players")[0].GetProperty("responseMs").GetInt32()==2000,"Timings survive server restart");
// Victory soundtrack belongs to the winner's fastest correct musical answer.
var vh=J(service.Create("Show host",20));var vc=vh.GetProperty("code").GetString()!;var vt=vh.GetProperty("token").GetString()!;
service.Join(vc,"Champion");service.Join(vc,"Runner");
service.With(vc,vt,(r,p)=>{
    r.Questions=Enumerable.Range(0,30).Select(i=>new ArenaQuestion("Question",new[]{"Song "+i},i>=25?"Music":"General",i>=25?"test.mp3":null,"Artist")).ToArray();
    var winner=r.Players[1];var runner=r.Players[2];winner.Score=1000;runner.Score=500;
    winner.Answers[25]=("wrong",0);winner.ResponseTimesMs[25]=100;
    winner.Answers[26]=("Song 26",140);winner.ResponseTimesMs[26]=3000;
    winner.Answers[27]=("Song 27",145);winner.ResponseTimesMs[27]=2000;
    runner.Answers[28]=("Song 28",149);runner.ResponseTimesMs[28]=500;
    Check(ArenaService.GetVictorySong(r)==null,"Celebration music inaccessible before finish");
    r.Phase="finished";r.Index=29;
    var song=ArenaService.GetVictorySong(r)!;
    Check(song.Index==27&&song.Player=="Champion"&&song.ResponseMs==2000,"Winner's fastest correct music answer chosen, not opponent or wrong answer");
    winner.Answers.Remove(27);winner.Answers.Remove(26);
    Check(ArenaService.GetVictorySong(r)==null,"No soundtrack when winner has no correct music answer");
    winner.Score=500;
    Check(ArenaService.GetVictorySong(r)?.Player=="Runner","Tied winners use the fastest eligible shared victory track");
    return true;
});
service=new ArenaService(clock,config);
Check(service.With(vc,vt,(r,p)=>ArenaService.GetVictorySong(r)?.Index)==28,"Victory music selection survives restart");
var victoryState=J(service.State(vc,vt)).GetProperty("victory");
Check(victoryState.GetProperty("winnerNames").GetArrayLength()==2,"Shared victory names are explicit");
// A new room is a new match: fresh PIN, empty guest roster, old enrolments invalid.
var rh=J(service.Create("Fresh host",20));var rc=rh.GetProperty("code").GetString()!;var rt=rh.GetProperty("token").GetString()!;
var rg=J(service.Join(rc,"Returning guest"));var rgt=rg.GetProperty("token").GetString()!;
Reject(()=>service.ResetLobby(rc,rgt),"Guest cannot clear waiting room");
service.Participation(rc,rt,true);service.Vote(rc,rt,categories);service.Vote(rc,rgt,categories);service.ResetLobby(rc,rt);
var empty=J(service.State(rc,rt));Check(empty.GetProperty("players").GetArrayLength()==1,"Host reset leaves only the host");
Check(empty.GetProperty("votes").GetArrayLength()==0,"Votes reset for fresh lobby");
Reject(()=>service.State(rc,rgt),"Removed guest token cannot re-enter silently");
var joinedAgain=J(service.Join(rc,"Returning guest"));Check(joinedAgain.GetProperty("token").GetString()!=rgt,"Returning guest explicitly joins with fresh token");
service.Leave(rc,joinedAgain.GetProperty("token").GetString()!);Check(J(service.State(rc,rt)).GetProperty("players").GetArrayLength()==1,"Leaving lobby removes guest immediately");
service.Leave(rc,rt);Reject(()=>service.State(rc,rt),"Host leaving closes the waiting room");
var reserved=JsonSerializer.Deserialize<string[]>(File.ReadAllText(Path.Combine(directory,"used-room-codes.json")))!;
Check(reserved.Contains(rc),"Closed room PIN remains reserved on disk");
service=new ArenaService(clock,config);var fresh=J(service.Create("New match",20));var newCode=fresh.GetProperty("code").GetString()!;
Check(!reserved.Contains(newCode),"New room PIN is fresh even after server restart");
Check(J(service.State(newCode,fresh.GetProperty("token").GetString()!)).GetProperty("players").GetArrayLength()==1,"New match never carries guests from an earlier room");
Reject(()=>service.ResetLobby(c2,t2),"Cannot clear participants during an active game");
// Host role is server enforced and survives restart.
var ph=J(service.Create("Playing host",20));var pc=ph.GetProperty("code").GetString()!;var pt=ph.GetProperty("token").GetString()!;
var pg=J(service.Join(pc,"Opponent"));var pgt=pg.GetProperty("token").GetString()!;
Reject(()=>service.Vote(pc,pt,categories),"Spectator host cannot vote");
Reject(()=>service.Participation(pc,pgt,true),"Guest cannot change host role");
service.Participation(pc,pt,true);service.Vote(pc,pt,categories);service.Participation(pc,pt,false);
Check(J(service.State(pc,pt)).GetProperty("votes").GetArrayLength()==0,"Disabling participation clears host votes");
service.Participation(pc,pt,true);service.Vote(pc,pgt,categories);
service.With(pc,pt,(r,p)=>{for(int i=0;i<5;i++)r.Music.Add(new ArenaQuestion("Music",new[]{"Host song"},"Music","test.mp3"));return true;});
Reject(()=>service.Start(pc,pt),"Playing host must also choose categories");
service.Vote(pc,pt,categories);service.Start(pc,pt);clock.Add(4);
Reject(()=>service.Participation(pc,pt,false),"Host role cannot change during match");
var hostState=J(service.State(pc,pt));Check(hostState.GetProperty("competitorCount").GetInt32()==2,"Playing host included in competition");
service.With(pc,pt,(r,p)=>{r.Players[1].Score=150;r.Players[1].Answers[0]=("answer",150);return true;});
hostState=J(service.State(pc,pt));Check(!hostState.GetProperty("rankingLive").GetBoolean(),"Playing host has no privileged live correctness view");
var hostAnswer=service.With(pc,pt,(r,p)=>r.Questions[0].Answers[0]);service.Answer(pc,pt,0,hostAnswer);
Check(J(service.State(pc,pt)).GetProperty("submitted").GetBoolean(),"Playing host can answer");
service=new ArenaService(clock,config);Check(J(service.State(pc,pt)).GetProperty("hostParticipates").GetBoolean(),"Host role survives restart");
service.With(pc,pt,(r,p)=>{r.Index=29;r.Phase="finished";p.Score=500;p.Answers[25]=("Host song",150);p.ResponseTimesMs[25]=500;return true;});
var hostVictory=J(service.State(pc,pt));Check(hostVictory.GetProperty("victory").GetProperty("winnerNames")[0].GetString()=="Playing host","Playing host can win");
Check(hostVictory.GetProperty("victory").GetProperty("song").GetProperty("player").GetString()=="Playing host","Host victory selects their fastest correct song");
Check(QuestionBank.Categories.Values.Sum(x=>x.Length)>=275,"Expanded question bank loaded");
for(int j=0;j<30;j++){var ch=QuestionBank.NewChain();Check(ch.Length==5&&ch.Zip(ch.Skip(1)).All(pair=>QuestionBank.Normalize(pair.First.Answers[0])[^1]==QuestionBank.Normalize(pair.Second.Answers[0])[0]),"Dynamic chain valid");}
service.With(pc,pt,(r,p)=>{r.Phase="question";r.Index=26;r.Deadline=clock.GetUtcNow().AddSeconds(25);p.Answers.Remove(26);return true;});
service.Answer(pc,pt,26,"Host song");
Check(J(service.State(pc,pt)).GetProperty("seconds").GetInt32()==25,"Music adds five seconds");
service.With(pc,pt,(r,p)=>{r.Index=27;r.Questions[27]=r.Questions[27] with {Artist="Test Artist"};r.Deadline=clock.GetUtcNow().AddSeconds(25);p.Answers.Remove(27);return true;});
service.Answer(pc,pt,27,"Test Artist");
Check(service.With(pc,pt,(r,p)=>p.Answers[27].Points)==50,"Artist-only answer earns fifty points");
Console.WriteLine("All arena checks passed. Temporary test data: " + directory);

class TestClock : TimeProvider
{
    DateTimeOffset now = DateTimeOffset.UtcNow;
    public override DateTimeOffset GetUtcNow() => now;
    public void Add(int seconds) => now = now.AddSeconds(seconds);
}
