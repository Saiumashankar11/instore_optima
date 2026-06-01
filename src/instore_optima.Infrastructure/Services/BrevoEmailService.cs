using System.Net.Http.Json;
using instore_optima.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace instore_optima.Infrastructure.Services
{
    /// <summary>
    /// Sends email through Brevo's transactional HTTP API (https, port 443) which
    /// corporate firewalls don't block — unlike raw SMTP (587/465). Falls back to
    /// <see cref="SmtpEmailService"/> automatically if Brevo isn't configured or a
    /// send fails, so email delivery is resilient on any network.
    /// </summary>
    public class BrevoEmailService : IEmailService
    {
        private const string Endpoint = "https://api.brevo.com/v3/smtp/email";

        private readonly IConfiguration _config;
        private readonly ILogger<BrevoEmailService> _logger;
        private readonly IHttpClientFactory _httpFactory;
        private readonly SmtpEmailService _smtpFallback;

        public BrevoEmailService(
            IConfiguration config,
            ILogger<BrevoEmailService> logger,
            IHttpClientFactory httpFactory,
            SmtpEmailService smtpFallback)
        {
            _config       = config;
            _logger       = logger;
            _httpFactory  = httpFactory;
            _smtpFallback = smtpFallback;
        }

        // ── Public API ──────────────────────────────────────────────────────────

        public Task SendOtpEmailAsync(string toEmail, string toName, string otp)
            => Send(toName, toEmail, EmailTemplates.LoginOtp(toName, otp),
                () => _smtpFallback.SendOtpEmailAsync(toEmail, toName, otp));

        public Task SendPasswordResetOtpEmailAsync(string toEmail, string toName, string otp)
            => Send(toName, toEmail, EmailTemplates.ResetOtp(toName, otp),
                () => _smtpFallback.SendPasswordResetOtpEmailAsync(toEmail, toName, otp));

        public Task SendAccountDeactivatedEmailAsync(string toEmail, string toName)
            => Send(toName, toEmail, EmailTemplates.Deactivated(toName),
                () => _smtpFallback.SendAccountDeactivatedEmailAsync(toEmail, toName));

        public Task SendContactSupportEmailAsync(string fromName, string fromEmail, string userMessage)
        {
            var (_, senderEmail) = Sender();
            var supportInbox = _config["Brevo:SupportEmail"] ?? senderEmail;
            return Send("InStore Optima Support", supportInbox,
                EmailTemplates.Support(fromName, fromEmail, userMessage),
                () => _smtpFallback.SendContactSupportEmailAsync(fromName, fromEmail, userMessage),
                replyToName: fromName, replyToEmail: fromEmail);
        }

        // ── Internals ───────────────────────────────────────────────────────────

        private async Task Send(string toName, string toEmail, EmailContent content,
            Func<Task> fallback, string? replyToName = null, string? replyToEmail = null)
        {
            var apiKey = _config["Brevo:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey) || apiKey.Contains("your-"))
            {
                // Not configured → let SMTP handle it.
                await fallback();
                return;
            }

            try
            {
                var (senderName, senderEmail) = Sender();
                var payload = new Dictionary<string, object?>
                {
                    ["sender"]      = new { name = senderName, email = senderEmail },
                    ["to"]          = new[] { new { email = toEmail, name = toName } },
                    ["subject"]     = content.Subject,
                    ["htmlContent"] = content.Html,
                };
                if (!string.IsNullOrWhiteSpace(replyToEmail))
                    payload["replyTo"] = new { email = replyToEmail, name = replyToName ?? replyToEmail };

                var client = _httpFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(15);

                using var req = new HttpRequestMessage(HttpMethod.Post, Endpoint);
                req.Headers.Add("api-key", apiKey);
                req.Headers.Add("accept", "application/json");
                req.Content = JsonContent.Create(payload);

                using var res = await client.SendAsync(req);
                if (res.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Email dispatched via Brevo → {Email}", toEmail);
                    return;
                }

                var body = await res.Content.ReadAsStringAsync();
                _logger.LogWarning("Brevo send failed ({Status}): {Body}. Falling back to SMTP.", res.StatusCode, body);
                await fallback();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Brevo send threw — falling back to SMTP for {Email}.", toEmail);
                await fallback();
            }
        }

        private (string Name, string Email) Sender()
        {
            var name  = _config["Brevo:SenderName"]  ?? _config["Smtp:FromName"]  ?? "InStore Optima";
            var email = _config["Brevo:SenderEmail"] ?? _config["Smtp:FromEmail"] ?? string.Empty;
            return (name, email);
        }
    }
}
