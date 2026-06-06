// =============================================================================
// SmtpEmailService.cs — SMTP email delivery using MailKit
// =============================================================================
// This is the "always available" email transport. It uses MailKit to connect
// to an SMTP server (e.g. Gmail's smtp.gmail.com on port 587 with STARTTLS)
// and send HTML emails. It is used in two ways:
//   1. Directly, when no Brevo API key is configured (registered as IEmailService).
//   2. As a fallback, injected into BrevoEmailService for resilience.
//
// If SMTP credentials are missing/placeholder, methods log a warning and
// return without throwing — this allows development without a real mail server.
// =============================================================================
using instore_optima.Domain.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace instore_optima.Infrastructure.Services
{
    /// <summary>
    /// Sends transactional emails over SMTP using MailKit and MimeKit.
    /// Configuration is read from the "Smtp" section in appsettings.json.
    /// </summary>
    public class SmtpEmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<SmtpEmailService> _logger;

        public SmtpEmailService(IConfiguration config, ILogger<SmtpEmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        // ── Public API ──────────────────────────────────────────────────────────
        // Each public method delegates to the private SendOrLog() helper,
        // providing the recipient details, the pre-built email content from
        // EmailTemplates, and a developer-friendly fallback log message for
        // when SMTP is not configured.

        public Task SendOtpEmailAsync(string toEmail, string toName, string otp)
            => SendOrLog(toName, toEmail, EmailTemplates.LoginOtp(toName, otp), $"Login OTP for {toEmail} is: {otp}");

        public Task SendPasswordResetOtpEmailAsync(string toEmail, string toName, string otp)
            => SendOrLog(toName, toEmail, EmailTemplates.ResetOtp(toName, otp), $"Password reset OTP for {toEmail} is: {otp}");

        public Task SendAccountDeactivatedEmailAsync(string toEmail, string toName)
            => SendOrLog(toName, toEmail, EmailTemplates.Deactivated(toName), $"would have sent deactivation notice to {toEmail}");

        public Task SendContactSupportEmailAsync(string fromName, string fromEmail, string userMessage)
        {
            if (!IsConfigured(out var username, out _, out var smtp))
            {
                _logger.LogWarning("⚠️  SMTP not configured — Support message from {Name} ({Email}): {Message}",
                    fromName, fromEmail, userMessage);
                return Task.CompletedTask;
            }
            // Support messages go to the support inbox, with the user set as Reply-To.
            var toEmail = smtp["FromEmail"] ?? username;
            return SendOrLog("InStore Optima Support", toEmail, EmailTemplates.Support(fromName, fromEmail, userMessage),
                $"Support message from {fromEmail} (not sent)",
                replyToName: fromName, replyToEmail: fromEmail);
        }

        // ── Internals ───────────────────────────────────────────────────────────

        // Builds a MimeMessage from the EmailContent and sends it. If SMTP is not
        // configured, logs the OTP/message to the console instead so developers
        // can still test the flow locally without a real email server.
        private async Task SendOrLog(string toName, string toEmail, EmailContent content, string devLog,
            string? replyToName = null, string? replyToEmail = null)
        {
            if (!IsConfigured(out var username, out var password, out var smtp))
            {
                _logger.LogWarning("⚠️  SMTP not configured — {DevLog}", devLog);
                return;
            }

            var message = new MimeMessage();
            message.From.Add(FromAddress(smtp, username));
            message.To.Add(new MailboxAddress(toName, toEmail));
            if (!string.IsNullOrWhiteSpace(replyToEmail))
                message.ReplyTo.Add(new MailboxAddress(replyToName ?? replyToEmail, replyToEmail));
            message.Subject = content.Subject;
            message.Body = new BodyBuilder { HtmlBody = content.Html }.ToMessageBody();

            await SendAsync(message, username, password, smtp);
            _logger.LogInformation("Email dispatched via SMTP → {Email}", toEmail);
        }

        // Checks that real (non-placeholder) SMTP credentials exist in configuration.
        // Also outputs the config section, username, and password via out parameters
        // so the caller doesn't have to read config again.
        private bool IsConfigured(out string username, out string password, out IConfigurationSection smtp)
        {
            smtp     = _config.GetSection("Smtp");
            username = smtp["Username"] ?? string.Empty;
            password = smtp["Password"] ?? string.Empty;

            return !string.IsNullOrWhiteSpace(username)
                && !username.Contains("your-gmail")
                && !string.IsNullOrWhiteSpace(password)
                && !password.Contains("xxxx");
        }

        private async Task SendAsync(MimeMessage message, string username, string password, IConfigurationSection smtp)
        {
            // Fail fast: if the network blocks the SMTP port (common on corporate
            // Wi-Fi), the TCP connect would otherwise hang until the OS timeout
            // (30s+) and trip the client's request timeout. Bound it to ~12s so the
            // controller can return a clear "couldn't send email" message quickly.
            var timeout = int.TryParse(smtp["TimeoutSeconds"], out var t) ? t : 12;
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(timeout));

            using var client = new SmtpClient { Timeout = timeout * 1000 };
            try
            {
                await client.ConnectAsync(
                    smtp["Host"]!,
                    int.Parse(smtp["Port"] ?? "587"),
                    SecureSocketOptions.StartTls,
                    cts.Token);
                await client.AuthenticateAsync(username, password, cts.Token);
                await client.SendAsync(message, cts.Token);
                await client.DisconnectAsync(true, cts.Token);
            }
            catch (OperationCanceledException)
            {
                throw new TimeoutException(
                    $"Timed out connecting to the mail server ({smtp["Host"]}:{smtp["Port"] ?? "587"}) after {timeout}s. " +
                    "The network may be blocking outbound email (SMTP). Try a different network or contact your administrator.");
            }
        }

        // Builds the "From" address shown to email recipients. Uses the friendly
        // display name from config, defaulting to "InStore Optima" if not set.
        private MailboxAddress FromAddress(IConfigurationSection smtp, string username)
            => new(smtp["FromName"] ?? "InStore Optima", smtp["FromEmail"] ?? username);
    }
}
