using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SpaServices.ReactDevelopmentServer;
using BE;  // tvoji namespace-ovi
using BE.Services;
using BE.Services.Interfaces;
using BE.Mapping;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using BE.Models.QuizHub;
using BE.Services.QuizHub;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<BE.Arena.ArenaConnectionInfo>();
builder.Services.AddRateLimiter(options=>{
    options.RejectionStatusCode=429;
    options.AddPolicy("arena-create",context=>RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString()??"unknown",_=>new FixedWindowRateLimiterOptions{PermitLimit=10,Window=TimeSpan.FromMinutes(1),QueueLimit=0,AutoReplenishment=true}));
    options.AddPolicy("arena-join",context=>RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString()??"unknown",_=>new FixedWindowRateLimiterOptions{PermitLimit=60,Window=TimeSpan.FromMinutes(1),QueueLimit=0,AutoReplenishment=true}));
    options.OnRejected=async(context,ct)=>{context.HttpContext.Response.Headers.RetryAfter="60";await context.HttpContext.Response.WriteAsJsonAsync(new{error="Previše pokušaja. Sačekaj minut i pokušaj ponovo."},ct);};
});

var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";

// CORS politika, slanje zahteva BE
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins,
        policy =>
        {
            policy.WithOrigins("http://localhost:3000")  // Frontend URL i port
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

//Swagger i podešavanje JWT u Swagger UI
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "MyAPI", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Unesi 'Bearer {token}'",
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement()
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type=ReferenceType.SecurityScheme,
                    Id="Bearer"
                },
                Scheme="Bearer",
                Name="Authorization",
                In=ParameterLocation.Header
            },
            new List<string>()
        }
    });
});

// Controllers i JSON opcije
builder.Services.AddControllersWithViews();
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// SPA statički fajlovi
builder.Services.AddSpaStaticFiles(configuration =>
{
    configuration.RootPath = "../FE/build";
});

// DbContext
builder.Services.AddDbContext<BE.AppContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Servisi
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IQuizService, QuizService>();
builder.Services.AddScoped<IQuestionService, QuestionService>();
builder.Services.AddScoped<IOptionService, OptionService>();
builder.Services.AddScoped<IResultService, ResultService>();

builder.Services.AddAutoMapper(typeof(Program));

//QuizHub
builder.Services.AddSignalR();
builder.Services.AddSingleton<LiveQuizManager>();
builder.Services.AddSingleton<BE.Arena.ArenaService>();
builder.Services.AddHttpClient("music", client => client.Timeout = TimeSpan.FromSeconds(12));
builder.Services.AddSingleton<BE.Arena.MusicLibrary>();
builder.Services.AddSingleton(TimeProvider.System);



// JWT Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = false,        
        ValidateAudience = false,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];

            // Ako je zahtev za SignalR hub, koristi access_token iz query stringa
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) &&
                (path.StartsWithSegments("/quizhub")))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

var app = builder.Build();
app.Services.GetRequiredService<BE.Arena.MusicLibrary>();


// Public play exposes only the Arena API; legacy administration, uploads and Swagger stay local-only.
app.Use(async(context,next)=>{
    var path=context.Request.Path;
    if(path=="/sw.js"||path=="/manifest.json"||path=="/index.html")context.Response.Headers.CacheControl="no-cache";
    if(builder.Configuration.GetValue<bool>("Arena:PublicMode")&&
      ((path.StartsWithSegments("/api")&&!path.StartsWithSegments("/api/arena"))||path.StartsWithSegments("/swagger")||path.StartsWithSegments("/quizhub")||
      (context.Request.Method=="POST"&&path.Value?.EndsWith("/music",StringComparison.OrdinalIgnoreCase)==true))){context.Response.StatusCode=404;return;}
    await next();
});
app.UseStaticFiles();
app.UseSpaStaticFiles();

app.UseRouting();
app.UseRateLimiter();

// CORS middleware pre autentifikacije i autorizacije
app.UseCors(MyAllowSpecificOrigins);

app.UseAuthentication();
app.UseAuthorization();

app.MapHub<QuizHub>("/quizhub", options =>
{
    options.Transports = Microsoft.AspNetCore.Http.Connections.HttpTransportType.WebSockets |
                         Microsoft.AspNetCore.Http.Connections.HttpTransportType.LongPolling;
});



app.UseEndpoints(endpoints =>
{
    endpoints.MapControllers();
});

// Swagger
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "MyAPI v1");
});

// SPA podešavanje
app.UseSpa(spa =>
{
    spa.Options.SourcePath = "../FE";

    if (app.Environment.IsDevelopment() && builder.Configuration.GetValue<bool>("StartReactDevServer"))
    {
        spa.UseReactDevelopmentServer(npmScript: "start");
    }
});

app.Run();
