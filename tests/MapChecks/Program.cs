using BE.Arena;
using System.Text.Json;

static void Check(bool pass,string message){if(!pass)throw new Exception(message);Console.WriteLine("PASS "+message);}
static JsonElement J(object value)=>JsonSerializer.SerializeToElement(value,new JsonSerializerOptions(JsonSerializerDefaults.Web));
static void Reject(Action action,string message){try{action();}catch(InvalidOperationException){Check(true,message);return;}throw new Exception(message);}
var clock=new TestClock();
var directory=Path.Combine(Path.GetTempPath(),"skocko-map-"+Guid.NewGuid().ToString("N"));
var config=new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?>{{"Arena:DataPath",directory}}).Build();
var service=new ArenaService(clock,config);

// A local, dependency-free browser fixture uses the real game service and test clock.
if(args.Contains("--serve")){
    var repository=new DirectoryInfo(System.AppContext.BaseDirectory);
    while(repository!=null&&!File.Exists(Path.Combine(repository.FullName,"FE","package.json")))repository=repository.Parent;
    var root=repository?.FullName??throw new InvalidOperationException("Repository root not found.");
    var builder=WebApplication.CreateBuilder(args);builder.WebHost.UseUrls("http://127.0.0.1:5198");
    var app=builder.Build();
    app.Use(async(ctx,next)=>{try{await next();}catch(InvalidOperationException e){ctx.Response.StatusCode=400;await ctx.Response.WriteAsJsonAsync(new{error=e.Message});}});
    app.MapPost("/api/arena/rooms",(Create req)=>service.Create(req.Name,20,false,req.MapEnabled));
    app.MapPost("/api/arena/rooms/{code}/join",(string code,Create req)=>service.Join(code,req.Name));
    string Token(HttpContext ctx)=>ctx.Request.Headers["X-Player-Token"].ToString();
    app.MapGet("/api/arena/rooms/{code}",(string code,HttpContext ctx)=>service.State(code,Token(ctx)));
    app.MapPost("/api/arena/rooms/{code}/vote",(string code,HttpContext ctx,Vote req)=>service.Vote(code,Token(ctx),req.Categories));
    app.MapPost("/api/arena/rooms/{code}/participation",(string code,HttpContext ctx,Participation req)=>service.Participation(code,Token(ctx),req.Participates));
    app.MapPost("/api/arena/rooms/{code}/start",(string code,HttpContext ctx)=>{
        service.With(code,Token(ctx),(r,p)=>{r.Music.AddRange(Enumerable.Range(0,5).Select(i=>new ArenaQuestion("Pesma",new[]{"Song "+i},"Music","test:"+i)));return true;});
        return service.Start(code,Token(ctx));
    });
    app.MapPost("/api/arena/rooms/{code}/map-answer",(string code,HttpContext ctx,MapAnswer req)=>service.AnswerMap(code,Token(ctx),req.Index,req.Latitude,req.Longitude));
    app.MapGet("/test/room/{code}",(string code,HttpContext ctx)=>service.With(code,Token(ctx),(r,p)=>new {r.Index,target=r.Index>=0?r.Questions[r.Index].Map:null}));
    app.MapPost("/test/advance/{seconds:int}",(int seconds)=>{clock.Add(seconds);return new{ok=true};});
    app.MapGet("/api/arena/offline-pack",()=>{
        var audio=Directory.GetFiles(Path.Combine(root,"BE","arena-data","audio-cache"),"*.mp3").Take(5).ToArray();
        if(audio.Length<5)throw new InvalidOperationException("Browser fixture requires five locally prepared music clips.");
        return new {questions=QuestionBank.Categories.Values.SelectMany(q=>q),mapQuestions=MapRound.Questions,
            songs=audio.Select((file,i)=>new {id="fixture:"+i,answers=new[]{"Fixture song "+i},artist="Fixture artist "+i,audio=Convert.ToBase64String(File.ReadAllBytes(file))})};
    });
    var build=Path.Combine(root,"FE","build");
    app.UseStaticFiles(new StaticFileOptions{FileProvider=new Microsoft.Extensions.FileProviders.PhysicalFileProvider(build)});
    app.MapFallback(async ctx=>await ctx.Response.SendFileAsync(Path.Combine(build,"index.html")));
    await app.RunAsync();return;
}

Check(MapRound.Questions.Length>=50,"Fifty map destinations available");
Check(MapRound.Questions.All(q=>q.Map!=null&&MapRound.Valid(new(q.Map.Latitude,q.Map.Longitude))),"All destination coordinates are valid");
foreach(int level in Enumerable.Range(1,5))Check(MapRound.Questions.Count(q=>q.Difficulty==level)>=10,"Ten destinations at level "+level);
Check(MapRound.DistanceKm(new(0,179),new(0,-179)) is >220 and <225,"Antimeridian distance follows the short route");
Check(MapRound.DistanceKm(new(90,0),new(90,150))<.001,"Longitude converges at the poles");
Check(MapRound.DistanceKm(new(51.5074,-.1278),new(48.8566,2.3522)) is >340 and <350,"Known London–Paris distance");
Check(MapRound.DistanceKm(new(0,0),new(0,180)) is >20000 and <20020,"Antipodal distance stays finite");
Check(new[]{0d,50,50.01,200,200.01,500,500.01,1000,1000.01,2000,2000.01,4000,4000.01}.Select(MapRound.Points).SequenceEqual(new[]{150,150,130,130,100,100,70,70,40,40,10,10,0}),"All scoring boundary values");
Check(!MapRound.Valid(new(double.NaN,0))&&!MapRound.Valid(new(91,0))&&!MapRound.Valid(new(0,181)),"Invalid and non-finite coordinates rejected");
var host=J(service.Create("Host",10,mapEnabled:true));var code=host.GetProperty("code").GetString()!;var ht=host.GetProperty("token").GetString()!;
var guest=J(service.Join(code,"Player"));var gt=guest.GetProperty("token").GetString()!;
var observer=J(service.Join(code,"Observer"));var ot=observer.GetProperty("token").GetString()!;
var cats=QuestionBank.Categories.Keys.Take(4).ToArray();service.Vote(code,gt,cats);service.Vote(code,ot,cats);
service.With(code,ht,(r,p)=>{r.Music.AddRange(Enumerable.Range(0,5).Select(i=>new ArenaQuestion("Pesma",new[]{"Song "+i},"Music","test:"+i)));return true;});
service.Start(code,ht);clock.Add(4);
Check(service.With(code,ht,(r,p)=>r.Questions.Length)==35,"Map-enabled match contains 35 questions");
Reject(()=>service.AnswerMap(code,gt,0,0,0),"Map endpoint rejects a regular question");
var total=0;
for(int i=0;i<35;i++){
    var q=service.With(code,ht,(r,p)=>r.Questions[i]);
    var initial=J(service.State(code,gt));
    Check(initial.GetProperty("index").GetInt32()==i,"Correct progression at question "+i);
    if(q.Map is MapLocation target){
        Check(i>=25&&i<30,"Map round precedes music");
        Check(initial.GetProperty("seconds").GetInt32()==30,"Map questions allow thirty seconds even at fast pace");
        Check(initial.GetProperty("map").GetProperty("target").ValueKind==JsonValueKind.Null,"Target hidden before submission");
        Reject(()=>service.Answer(code,gt,i,q.Answers[0]),"Text answer cannot score map questions");
        Reject(()=>service.AnswerMap(code,ht,i,target.Latitude,target.Longitude),"Spectator host cannot score map questions");
        Reject(()=>service.AnswerMap(code,gt,i,double.PositiveInfinity,0),"Infinite coordinate rejected by service");
        Reject(()=>service.AnswerMap(code,gt,i,91,0),"Out-of-range coordinate rejected by service");
        clock.Add(5);service.AnswerMap(code,gt,i,target.Latitude,target.Longitude);total+=150;
        var submitted=J(service.State(code,gt));
        Check(submitted.GetProperty("map").GetProperty("target").ValueKind==JsonValueKind.Null&&submitted.GetProperty("map").GetProperty("guesses").ValueKind==JsonValueKind.Null,"Submitting does not unlock target or opponents' pins");
        Check(submitted.GetProperty("map").GetProperty("guess").GetProperty("latitude").GetDouble()==target.Latitude,"Own locked pin available");
        var hidden=J(service.State(code,ot));
        Check(hidden.GetProperty("map").GetProperty("guess").ValueKind==JsonValueKind.Null&&hidden.GetProperty("map").GetProperty("guesses").ValueKind==JsonValueKind.Null,"Other players cannot inspect the submitted pin");
        Check(hidden.GetProperty("players").EnumerateArray().First(p=>p.GetProperty("name").GetString()=="Player").GetProperty("score").GetInt32()==total-150,"Map score hidden from unanswered opponents");
        service=new ArenaService(clock,config);
        Check(J(service.State(code,gt)).GetProperty("map").GetProperty("guess").ValueKind==JsonValueKind.Object,"Map answer survives restart");
        Reject(()=>service.AnswerMap(code,gt,i,target.Latitude,target.Longitude),"Duplicate map answer rejected after restart");
    }else{
        service.Answer(code,gt,i,q.Answers[0]);total+=q.AudioUrl==null?150:100;
        if(i>=30)Check(initial.GetProperty("seconds").GetInt32()==15,"Music keeps five-second bonus after map round");
    }
    clock.Add(initial.GetProperty("seconds").GetInt32()-(q.Map!=null?5:0));
    var reveal=J(service.State(code,gt));
    Check(reveal.GetProperty("phase").GetString()=="reveal","Answer reveal at question "+i);
    if(q.Map is MapLocation location){
        var map=reveal.GetProperty("map");
        Check(map.GetProperty("target").GetProperty("label").GetString()==location.Label,"Correct destination revealed");
        Check(map.GetProperty("distanceKm").GetDouble()<.01&&map.GetProperty("guesses").GetArrayLength()==1,"Distance and all submitted pins revealed together");
        Check(reveal.GetProperty("points").GetInt32()==150,"Exact map score ignores speed");
        Reject(()=>service.AnswerMap(code,ot,i,location.Latitude,location.Longitude),"Late map answer rejected");
    }
    clock.Add(5);
}
var finished=J(service.State(code,gt));
Check(finished.GetProperty("phase").GetString()=="finished","Full 35-question match finishes");
Check(finished.GetProperty("victory").GetProperty("score").GetInt32()==total,"Final score includes map and music correctly");
Check(finished.GetProperty("victory").GetProperty("song").GetProperty("index").GetInt32()>=30,"Victory music uses shifted music indexes");
Console.WriteLine("All map checks passed.");

Check(QuestionBank.AvailableCategories.Contains("Igrice")&&QuestionBank.AvailableCategories.Contains(QuestionBank.MapCategory),"Games and map appear together in selectable categories");
Check(QuestionBank.Categories["Igrice"].Length==250,"Gaming category has 250 questions");
foreach(var level in Enumerable.Range(1,5))Check(QuestionBank.Categories["Igrice"].Count(q=>q.Difficulty==level)==50,"Fifty gaming questions at level "+level);
Reject(()=>service.Vote(code,gt,new[]{"Igrice"}),"One category is not accepted");
Check(!QuestionBank.ValidVotes(new[]{"Igrice"})&&!QuestionBank.ValidVotes(new[]{"Igrice","Igrice"})&&!QuestionBank.ValidVotes(new[]{"Igrice","unknown"}),"Minimum, duplicates and whitelist checked");

var smallHost=J(service.Create("Small host",20));var sc=smallHost.GetProperty("code").GetString()!;var sh=smallHost.GetProperty("token").GetString()!;
var smallGuest=J(service.Join(sc,"Small player"));var sg=smallGuest.GetProperty("token").GetString()!;
Reject(()=>service.Vote(sc,sg,new[]{"Igrice"}),"Lobby rejects a single category");
service.Vote(sc,sg,new[]{"Igrice",QuestionBank.MapCategory});
var ready=J(service.State(sc,sh));
Check(ready.GetProperty("players").EnumerateArray().First(p=>p.GetProperty("name").GetString()=="Small player").GetProperty("voted").GetBoolean(),"Two selected categories mark a player ready");
service.With(sc,sh,(r,p)=>{r.Music.AddRange(Enumerable.Range(0,5).Select(i=>new ArenaQuestion("Music",new[]{"Short song "+i},"Music","test:"+i)));return true;});
service.Start(sc,sh);clock.Add(4);
Check(service.With(sc,sh,(r,p)=>r.Selected.SequenceEqual(new[]{"Igrice",QuestionBank.MapCategory})&&r.Questions.Length==20),"Two categories produce twenty questions with no unchosen filler");
Check(service.With(sc,sh,(r,p)=>r.Questions.Count(q=>q.Map!=null))==5,"Map selected as a category appears once");
for(int i=0;i<20;i++){
    var current=service.With(sc,sh,(r,p)=>r.Questions[i]);var duration=J(service.State(sc,sg)).GetProperty("seconds").GetInt32();
    if(current.Map is MapLocation target)service.AnswerMap(sc,sg,i,target.Latitude,target.Longitude);else service.Answer(sc,sg,i,current.Answers[0]);
    clock.Add(duration+5);
}
var shortEnd=J(service.State(sc,sg));Check(shortEnd.GetProperty("phase").GetString()=="finished","Twenty-question game ends at the correct index");
Check(shortEnd.GetProperty("victory").GetProperty("song").GetProperty("index").GetInt32()>=15,"Short matches still choose victory music");

var unionHost=J(service.Create("Union host",20));var uc=unionHost.GetProperty("code").GetString()!;var uh=unionHost.GetProperty("token").GetString()!;
var a=J(service.Join(uc,"A")).GetProperty("token").GetString()!;var b=J(service.Join(uc,"B")).GetProperty("token").GetString()!;
service.Vote(uc,a,new[]{"Igrice","Sport"});service.Vote(uc,b,new[]{"Nauka",QuestionBank.MapCategory});
service.With(uc,uh,(r,p)=>{r.Music.AddRange(Enumerable.Range(0,5).Select(i=>new ArenaQuestion("Music",new[]{"Union song "+i},"Music","test:"+i)));return true;});
service.Start(uc,uh);
Check(service.With(uc,uh,(r,p)=>r.Selected.Length==4&&r.Selected.Contains("Igrice")&&r.Selected.Contains("Sport")&&r.Selected.Contains("Nauka")&&r.Selected[^1]==QuestionBank.MapCategory&&r.Questions.Length==30),"Mixed player choices retain every voted subject and put map before music");
Check(QuestionBank.ValidVotes(QuestionBank.AvailableCategories),"Players may select every available category");
Console.WriteLine("All category-selection checks passed.");

record Create(string Name,bool MapEnabled=false);
record Vote(string[] Categories);
record Participation(bool Participates);
record MapAnswer(int Index,double Latitude,double Longitude);
class TestClock:TimeProvider{DateTimeOffset now=DateTimeOffset.UtcNow;public override DateTimeOffset GetUtcNow()=>now;public void Add(int seconds)=>now=now.AddSeconds(seconds);}
