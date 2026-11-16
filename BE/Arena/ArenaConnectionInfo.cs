using System.Diagnostics;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Text.Json;
namespace BE.Arena;
public sealed class ArenaConnectionInfo(IConfiguration config,IWebHostEnvironment env)
{
    public string? PublicUrl()
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
    static bool Valid(string? url)=>Uri.TryCreate(url,UriKind.Absolute,out var uri)&&uri.Scheme=="https"&&string.IsNullOrEmpty(uri.UserInfo)&&uri.AbsolutePath=="/"&&string.IsNullOrEmpty(uri.Query)&&string.IsNullOrEmpty(uri.Fragment);
    static bool Private(IPAddress address){var b=address.GetAddressBytes();return address.AddressFamily==AddressFamily.InterNetwork&&(b[0]==10||b[0]==192&&b[1]==168||b[0]==172&&b[1]>=16&&b[1]<=31);}
    public object Describe(HttpRequest request)
    {
        var host=request.Host.Host;var local=host=="localhost"||IPAddress.TryParse(host,out var ip)&&(IPAddress.IsLoopback(ip)||Private(ip));
        var port=config.GetValue<int?>("Arena:Port")??request.Host.Port??5087;
        var urls=local?NetworkInterface.GetAllNetworkInterfaces().Where(n=>n.OperationalStatus==OperationalStatus.Up&&n.NetworkInterfaceType!=NetworkInterfaceType.Loopback&&n.NetworkInterfaceType!=NetworkInterfaceType.Tunnel)
            .OrderByDescending(n=>n.GetIPProperties().GatewayAddresses.Count>0).SelectMany(n=>n.GetIPProperties().UnicastAddresses).Select(a=>a.Address).Where(Private).Distinct().Select(a=>$"http://{a}:{port}").ToArray():Array.Empty<string>();
        return new {publicUrl=PublicUrl(),lanUrls=urls,installRequiresHttps=true,publicMode=config.GetValue<bool>("Arena:PublicMode")};
    }
}
