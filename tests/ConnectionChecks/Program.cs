using BE.Arena;
using Microsoft.Extensions.FileProviders;
using System.Net;
using System.Text.Json;

foreach(var scenario in new[]{"healthy","wrong-server","dead","invalid-json"}){
    var handler=new ProbeHandler();
    var config=new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?>{{"Arena:PublicUrl","https://quiz.example"}}).Build();
    var service=new ArenaConnectionInfo(config,new TestEnvironment(),new ClientFactory(handler));
    handler.Reply=()=>scenario switch{
        "healthy"=>new HttpResponseMessage(HttpStatusCode.OK){Content=new StringContent(JsonSerializer.Serialize(new{ok=true,instanceId=service.InstanceId}))},
        "wrong-server"=>new HttpResponseMessage(HttpStatusCode.OK){Content=new StringContent("{\"ok\":true,\"instanceId\":\"other\"}")},
        "dead"=>throw new HttpRequestException("Tunnel not found"),
        _=>new HttpResponseMessage(HttpStatusCode.OK){Content=new StringContent("<html>Unavailable</html>")}
    };
    var first=await service.PublicUrlAsync();var second=await service.PublicUrlAsync();
    if((first!=null)!=(scenario=="healthy")||first!=second||handler.Calls!=1)throw new Exception("Failed: "+scenario);
    Console.WriteLine("PASS "+scenario+" and cached health probe");
}
sealed class ProbeHandler:HttpMessageHandler{
    public int Calls;public Func<HttpResponseMessage> Reply=null!;
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,CancellationToken ct){Calls++;return Task.FromResult(Reply());}
}
sealed class ClientFactory(ProbeHandler handler):IHttpClientFactory{public HttpClient CreateClient(string name)=>new(handler,false);}
sealed class TestEnvironment:IWebHostEnvironment{
    public string EnvironmentName{get;set;}="Testing";
    public string ApplicationName{get;set;}="ConnectionChecks";
    public string WebRootPath{get;set;}=".";
    public string ContentRootPath{get;set;}=".";
    public IFileProvider WebRootFileProvider{get;set;}=new NullFileProvider();
    public IFileProvider ContentRootFileProvider{get;set;}=new NullFileProvider();
}
