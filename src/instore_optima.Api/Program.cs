using Serilog;
using instore_optima.Infrastructure.Data;

using instore_optima.Infrastructure.Interfaces;
using instore_optima.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using instore_optima.Domain.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using instore_optima.Api.Repositories.Interfaces;
using instore_optima.Api.Repositories.Implementations;
using instore_optima.Api.Middleware;

var builder = WebApplication.CreateBuilder(args);

// --- Serilog Configuration ------------------------------------
const string OutputTemplate = "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}";
const string FileTemplate   = "[{Timestamp:yyyy-MM-dd HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}";

builder.Host.UseSerilog((context, loggerConfig) =>
{
    loggerConfig
        .ReadFrom.Configuration(context.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Console(
            outputTemplate: OutputTemplate,
            theme: Serilog.Sinks.SystemConsole.Themes.AnsiConsoleTheme.Code)
        .WriteTo.File(
            "Logs/log-.txt",
            outputTemplate: FileTemplate,
            rollingInterval: RollingInterval.Day,
            retainedFileCountLimit: 30);
});

// Add services to the container.
// --- Team Database: Archana ---
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();
 
// --- Team API & Security: Abdul ---
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<IStockRepository, StockRepository>();
builder.Services.AddScoped<IStockMovementRepository, StockMovementRepository>();
builder.Services.AddScoped<IReplenishmentRepository, ReplenishmentRepository>();
 
// --- Team API & Security: Lekha ---
builder.Services.AddScoped<ISupplierRepository, SupplierRepository>();
builder.Services.AddScoped<IPurchaseOrderRepository, PurchaseOrderRepository>();
 
// --- Team Backend: Pruthvi ---
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddScoped<IOrderItemRepository, OrderItemRepository>();
builder.Services.AddScoped<IPaymentRepository, PaymentRepository>();
 
// --- Team Backend: Santosh ---
builder.Services.AddScoped<IInvoiceRepository, InvoiceRepository>();
builder.Services.AddScoped<IReceiptRepository, ReceiptRepository>();

// ── Audit interceptor ──────────────────────────────────
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<instore_optima.Infrastructure.Data.AuditInterceptor>();

builder.Services.AddDbContext<AppDbContext>((sp, options) =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"),
        b => b.MigrationsAssembly("instore_optima.Api"));
    options.AddInterceptors(sp.GetRequiredService<instore_optima.Infrastructure.Data.AuditInterceptor>());
});
builder.Services.AddScoped<instore_optima.Api.Filters.CrudLoggingFilter>();
builder.Services.AddControllers(opts => opts.Filters.AddService<instore_optima.Api.Filters.CrudLoggingFilter>());


// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();


builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter: Bearer {your token here}"
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id   = "Bearer"
                }
            },
            new string[] {}
        }
    });

    // Include XML comments (enable in .csproj as well)
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = System.IO.Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (System.IO.File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});

// ─── Auth Repository ──────────────────────────────────
builder.Services.AddScoped<IAuthRepository, AuthRepository>();

// ─── Email / 2FA ──────────────────────────────────────
// SMTP is always available (used directly, or as the fallback for Brevo).
builder.Services.AddScoped<instore_optima.Infrastructure.Services.SmtpEmailService>();

var brevoKey = builder.Configuration["Brevo:ApiKey"];
if (!string.IsNullOrWhiteSpace(brevoKey) && !brevoKey.Contains("your-"))
{
    // Brevo configured → send over HTTPS (works on networks that block SMTP),
    // with automatic fallback to SMTP if a Brevo call fails.
    builder.Services.AddHttpClient();
    builder.Services.AddScoped<instore_optima.Domain.Interfaces.IEmailService,
                               instore_optima.Infrastructure.Services.BrevoEmailService>();
}
else
{
    // No Brevo key → use SMTP directly.
    builder.Services.AddScoped<instore_optima.Domain.Interfaces.IEmailService>(
        sp => sp.GetRequiredService<instore_optima.Infrastructure.Services.SmtpEmailService>());
}

// ─── Internal Messaging ───────────────────────────────
builder.Services.AddScoped<IInternalMessageRepository, InternalMessageRepository>();
builder.Services.AddScoped<instore_optima.Domain.Interfaces.IPONotificationService,
                           instore_optima.Infrastructure.Services.PONotificationService>();

// ─── JWT Authentication ───────────────────────────────
// Fail fast on a missing/weak signing key instead of using a null-forgiving '!'.
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
{
    throw new InvalidOperationException(
        "Jwt:Key is missing or too short (min 32 chars). Set it via user-secrets " +
        "(dotnet user-secrets set \"Jwt:Key\" \"<long-random-value>\") or an environment variable.");
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseSerilogRequestLogging(opts =>
{
    opts.GetLevel = (ctx, _, _) =>
        ctx.Request.Path.StartsWithSegments("/api/auth/ping") ||
        ctx.Request.Path.StartsWithSegments("/api/messages/unread-count") ||
        ctx.Request.Path.StartsWithSegments("/api/badges") ||
        ctx.Request.Path.StartsWithSegments("/api/dashboard/summary")
            ? Serilog.Events.LogEventLevel.Verbose
            : Serilog.Events.LogEventLevel.Information;
});

// ─── Global Exception Handling Middleware ────────────
app.UseMiddleware<GlobalExceptionHandlingMiddleware>();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseMiddleware<InactiveUserMiddleware>();
app.UseAuthorization();
app.MapControllers();

app.Run();

