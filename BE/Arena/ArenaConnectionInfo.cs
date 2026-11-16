using System.Diagnostics;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Net.Http.Json;
using System.Text.Json;
namespace BE.Arena;
public sealed class ArenaConnectionInfo(IConfiguration config,IWebHostEnvironment env,IHttpClientFactory clients)
{
    public string InstanceId { get; } = Guid.NewGuid().ToString("N");
    readonly SemaphoreSlim probeGate=new(1,1);
    string? checkedCandidate,reachableUrl;
    DateTimeOffset nextProbe;
    public record HealthProbe(bool Ok,string InstanceId);
    string? CandidateUrl()
    {
        var configured=config["Arena:PublicUrl"];
        if(Valid(configured))return configured!.TrimEnd('/');
        try {
            var file=Path.Combine(config["Arena:DataPath"]??Path.Combine(env.ContentRootPath,"arena-data"),"public-link.json");
            if(!File.Exists(file))return null;
            using var data=JsonDocument.Parse(File.ReadAllText(file));var url=data.RootElement.GetProperty("url").GetString();
            var pid=data.RootElement.GetProperty("pid").GetInt32();using var process=Process.GetProcessById(pid);
            return !process.HasExited&&process.ProcessName.Equals("cloudflared",StringComparison.OrdinalIgnoreCase)&&Valid(url)?url!.TrimEnd('/'):null;
        }catch(Exception e)when(e is IOException or JsonException or ArgumentException or InvalidOperationException or KeyNotFoundException or System.ComponentModel.Win32Exception){return null;}
    }
    public async Task<string?> PublicUrlAsync(CancellationToken ct=default)
    {
        var candidate=CandidateUrl();
        if(candidate==null)return null;
        await probeGate.WaitAsync(ct);
        try {
            if(candidate==checkedCandidate&&DateTimeOffset.UtcNow<nextProbe)return reachableUrl;
            reachableUrl=null;checkedCandidate=candidate;
            using var timeout=CancellationTokenSource.CreateLinkedTokenSource(ct);timeout.CancelAfter(TimeSpan.FromSeconds(4));
            try {
                using var client=clients.CreateClient("arena-connection");
                using var response=await client.GetAsync(candidate+"/api/arena/health",timeout.Token);
                if(response.IsSuccessStatusCode){
                    var health=await response.Content.ReadFromJsonAsync<HealthProbe>(cancellationToken:timeout.Token);
                    if(health is {Ok:true}&&health.InstanceId==InstanceId)reachableUrl=candidate;
                }
            } catch(Exception e)when(e is HttpRequestException or OperationCanceledException or JsonException or NotSupportedException){}
            nextProbe=DateTimeOffset.UtcNow.AddSeconds(10);
            return reachableUrl;
        }finally{probeGate.Release();}
    }
    static bool Valid(string? url)=>Uri.TryCreate(url,UriKind.Absolute,out var uri)&&uri.Scheme=="https"&&string.IsNullOrEmpty(uri.UserInfo)&&uri.AbsolutePath=="/"&&string.IsNullOrEmpty(uri.Query)&&string.IsNullOrEmpty(uri.Fragment);
    static bool Private(IPAddress address){var b=address.GetAddressBytes();return address.AddressFamily==AddressFamily.InterNetwork&&(b[0]==10||b[0]==192&&b[1]==168||b[0]==172&&b[1]>=16&&b[1]<=31);}
    public async Task<object> DescribeAsync(HttpRequest request,CancellationToken ct=default)
    {
        var host=request.Host.Host;var local=host=="localhost"||IPAddress.TryParse(host,out var ip)&&(IPAddress.IsLoopback(ip)||Private(ip));
        var port=config.GetValue<int?>("Arena:Port")??request.Host.Port??5087;
        var urls=local?NetworkInterface.GetAllNetworkInterfaces().Where(n=>n.OperationalStatus==OperationalStatus.Up&&n.NetworkInterfaceType!=NetworkInterfaceType.Loopback&&n.NetworkInterfaceType!=NetworkInterfaceType.Tunnel)
            .OrderByDescending(n=>n.GetIPProperties().GatewayAddresses.Count>0).SelectMany(n=>n.GetIPProperties().UnicastAddresses).Select(a=>a.Address).Where(Private).Distinct().Select(a=>$"http://{a}:{port}").ToArray():Array.Empty<string>();
        return new {publicUrl=await PublicUrlAsync(ct),lanUrls=urls,installRequiresHttps=true,publicMode=config.GetValue<bool>("Arena:PublicMode"),instanceId=InstanceId};
    }
}
