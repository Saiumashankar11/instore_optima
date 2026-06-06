// =============================================================================
// Program.cs — Application Entry Point
// =============================================================================
// This is the very first file that runs when the server starts.
// It has two jobs:
//   1. BUILDER PHASE  – register all services into the Dependency Injection (DI)
//      container so ASP.NET Core knows how to create them on demand.
//   2. APP PHASE      – assemble the HTTP middleware pipeline that every
//      incoming request flows through, then start listening.
// =============================================================================
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

// WebApplication.CreateBuilder sets up the host (config files, env vars, etc.)
// and gives us a "builder" object we use to register all services.
var builder = WebApplication.CreateBuilder(args);

// --- Serilog Configuration ------------------------------------
// Serilog is a structured logging library. We configure it to write logs to
// both the console (colored, easy to read during development) and to daily
// rotating text files kept for 30 days (useful for post-mortem debugging).
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

// =============================================================================
// SECTION: Dependency Injection — Repository registrations
// =============================================================================
// Each AddScoped call tells DI: "whenever a controller asks for the interface
// on the left, create an instance of the concrete class on the right and keep
// it alive for the lifetime of one HTTP request."
//
// Repositories follow the Repository Pattern: they hide raw database queries
// behind a clean interface so controllers never touch SQL/EF directly.
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

// =============================================================================
// SECTION: EF Core DbContext + Audit Interceptor
// =============================================================================
// ── Audit interceptor ──────────────────────────────────
// IHttpContextAccessor lets services (like the audit interceptor) read the
// current HTTP request (e.g. to find out who is logged in) even when they
// are not controllers.
builder.Services.AddHttpContextAccessor();
// AuditInterceptor is registered as Singleton so EF Core can inject it once
// and reuse it for every DbContext instance. It automatically writes an audit
// row whenever data is saved (see AuditInterceptor.cs).
builder.Services.AddSingleton<instore_optima.Infrastructure.Data.AuditInterceptor>();

// Register AppDbContext so EF Core knows which database to connect to.
// MigrationsAssembly tells EF that migration files live in the API project.
// AddInterceptors hooks the AuditInterceptor into every SaveChanges call.
builder.Services.AddDbContext<AppDbContext>((sp, options) =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"),
        b => b.MigrationsAssembly("instore_optima.Api"));
    options.AddInterceptors(sp.GetRequiredService<instore_optima.Infrastructure.Data.AuditInterceptor>());
});
// CrudLoggingFilter runs after every controller action to log who did what.
// AddService<T> makes DI resolve it so it can receive its own constructor deps.
builder.Services.AddScoped<instore_optima.Api.Filters.CrudLoggingFilter>();
builder.Services.AddControllers(opts => opts.Filters.AddService<instore_optima.Api.Filters.CrudLoggingFilter>());


// =============================================================================
// SECTION: Swagger / OpenAPI
// =============================================================================
// Swagger generates an interactive browser UI at /swagger so developers can
// test every API endpoint without needing Postman or a frontend.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();

// Configure Swagger to support JWT bearer tokens in the UI. This adds the
// padlock icon so testers can paste a JWT and send authenticated requests.
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

// =============================================================================
// SECTION: Authentication, Email, and Messaging services
// =============================================================================
// ─── Auth Repository ──────────────────────────────────
builder.Services.AddScoped<IAuthRepository, AuthRepository>();

// ─── Email / 2FA ──────────────────────────────────────
// Strategy: prefer Brevo (HTTP-based, firewall-friendly) but fall back to
// SMTP when the Brevo API key is absent or invalid.
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
// JSON Web Tokens (JWT) are how we verify who a user is on every request.
// The client logs in, receives a signed JWT, then sends it in the
// "Authorization: Bearer <token>" header with each subsequent request.
// Fail fast on a missing/weak signing key instead of using a null-forgiving '!'.
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
{
    throw new InvalidOperationException(
        "Jwt:Key is missing or too short (min 32 chars). Set it via user-secrets " +
        "(dotnet user-secrets set \"Jwt:Key\" \"<long-random-value>\") or an environment variable.");
}

// Register JWT Bearer authentication. On each request ASP.NET Core will:
//   1. Extract the token from the Authorization header.
//   2. Validate the signature using the symmetric key stored in config.
//   3. Check that the issuer, audience, and expiry are all correct.
//   4. If valid, populate context.User with the claims inside the token.
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

// =============================================================================
// SECTION: CORS (Cross-Origin Resource Sharing)
// =============================================================================
// Browsers block requests that originate from a different domain/port than
// the API. We whitelist the local Vite dev server (port 5173) so the React
// frontend can call the API during development.
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// =============================================================================
// SECTION: Middleware pipeline
// =============================================================================
// After builder.Build() the host is fully configured. Now we assemble the
// pipeline — a chain of middleware components. Each request enters at the top
// and travels down the chain; each response travels back up.
//
// ORDER IS CRITICAL: changing the order changes behavior. For example,
// UseAuthentication must come before UseAuthorization, and our custom
// exception handler must come first so it can catch errors from any later step.
var app = builder.Build();

// Reduce log noise for high-frequency polling endpoints (e.g. ping, badges)
// by logging them at Verbose instead of Information so they don't flood logs.
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
// Placed first so it wraps the entire rest of the pipeline and converts any
// unhandled exception into a JSON error response with the right HTTP status.
app.UseMiddleware<GlobalExceptionHandlingMiddleware>();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    // Only expose the Swagger UI in development — never in production.
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Redirect all HTTP requests to HTTPS for security.
app.UseHttpsRedirection();
// Apply the CORS policy so the frontend can talk to this API.
app.UseCors("AllowFrontend");
// Validate the JWT token and populate context.User.
app.UseAuthentication();
// After authentication, check if the user's account has been deactivated.
app.UseMiddleware<InactiveUserMiddleware>();
// Check [Authorize] attributes on controllers using the populated context.User.
app.UseAuthorization();
// Wire up all controller classes to their route paths (e.g. /api/products).
app.MapControllers();

app.Run();

