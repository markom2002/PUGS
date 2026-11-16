using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SpaServices.ReactDevelopmentServer;
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<BE.Arena.ArenaConnectionInfo>();
builder.Services.AddSingleton<BE.Arena.ArenaService>();
builder.Services.AddSingleton<BE.Arena.MusicLibrary>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddHttpClient("music", client => client.Timeout = TimeSpan.FromSeconds(12));
builder.Services.AddControllers();
builder.Services.AddSpaStaticFiles(options => options.RootPath = "../FE/build");
// Keep the existing SQL migration history. Arena uses MusicTracks directly.
builder.Services.AddDbContext<BE.AppContext>(options => options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy.WithOrigins("http://localhost:3000").AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddRateLimiter(options => {
    options.RejectionStatusCode = 429;
    options.AddPolicy("arena-create", context => RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1), QueueLimit = 0, AutoReplenishment = true }));
    options.AddPolicy("arena-join", context => RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = 60, Window = TimeSpan.FromMinutes(1), QueueLimit = 0, AutoReplenishment = true }));
    options.OnRejected = async (context, ct) => {
        context.HttpContext.Response.Headers.RetryAfter = "60";
        await context.HttpContext.Response.WriteAsJsonAsync(new { error = "Previše pokušaja. Sačekaj minut i pokušaj ponovo." }, ct);
    };
});
var app = builder.Build();
app.Services.GetRequiredService<BE.Arena.MusicLibrary>();
app.Use(async (context, next) => {
    var path = context.Request.Path;
    if (path == "/sw.js" || path == "/manifest.json" || path == "/index.html") context.Response.Headers.CacheControl = "no-cache";
    if ((path.StartsWithSegments("/api") && !path.StartsWithSegments("/api/arena")) || path.StartsWithSegments("/swagger") || path.StartsWithSegments("/quizhub") || (builder.Configuration.GetValue<bool>("Arena:PublicMode") && context.Request.Method == "POST" && path.Value?.EndsWith("/music", StringComparison.OrdinalIgnoreCase) == true)) { context.Response.StatusCode = 404; return; }
    await next();
});
app.UseSpaStaticFiles();
app.UseRouting();
app.UseCors();
app.UseRateLimiter();
app.MapControllers();
app.UseSpa(spa => {
    spa.Options.SourcePath = "../FE";
    if (app.Environment.IsDevelopment() && builder.Configuration.GetValue<bool>("StartReactDevServer")) spa.UseReactDevelopmentServer(npmScript: "start");
});
app.Run();
