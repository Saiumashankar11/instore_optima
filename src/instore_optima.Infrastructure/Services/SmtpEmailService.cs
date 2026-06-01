using instore_optima.Domain.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace instore_optima.Infrastructure.Services
{
    public class SmtpEmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<SmtpEmailService> _logger;

        public SmtpEmailService(IConfiguration config, ILogger<SmtpEmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        // ── Helpers ─────────────────────────────────────────────────────────────

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

        private MailboxAddress FromAddress(IConfigurationSection smtp, string username)
            => new(smtp["FromName"] ?? "InStore Optima", smtp["FromEmail"] ?? username);

        // ── Login OTP ────────────────────────────────────────────────────────────

        public async Task SendOtpEmailAsync(string toEmail, string toName, string otp)
        {
            if (!IsConfigured(out var username, out var password, out var smtp))
            {
                _logger.LogWarning(
                    "⚠️  SMTP not configured — Login OTP for {Email} is: {Otp}",
                    toEmail, otp);
                return;
            }

            var message = new MimeMessage();
            message.From.Add(FromAddress(smtp, username));
            message.To.Add(new MailboxAddress(toName, toEmail));
            message.Subject = $"Your InStore Optima sign-in code: {otp}";

            message.Body = new BodyBuilder { HtmlBody = OtpHtml(toName, otp,
                "Two-Factor Verification",
                "Someone (hopefully you) is signing in to InStore Optima. Enter the code below to complete sign-in.",
                "#0891b2") }.ToMessageBody();

            await SendAsync(message, username, password, smtp);
            _logger.LogInformation("Login OTP email dispatched → {Email}", toEmail);
        }

        // ── Password Reset OTP ───────────────────────────────────────────────────

        public async Task SendPasswordResetOtpEmailAsync(string toEmail, string toName, string otp)
        {
            if (!IsConfigured(out var username, out var password, out var smtp))
            {
                _logger.LogWarning(
                    "⚠️  SMTP not configured — Password reset OTP for {Email} is: {Otp}",
                    toEmail, otp);
                return;
            }

            var message = new MimeMessage();
            message.From.Add(FromAddress(smtp, username));
            message.To.Add(new MailboxAddress(toName, toEmail));
            message.Subject = $"Reset your InStore Optima password: {otp}";

            message.Body = new BodyBuilder { HtmlBody = OtpHtml(toName, otp,
                "Password Reset",
                "You requested a password reset for your InStore Optima account. Enter the code below to set a new password. If you didn't request this, ignore this email.",
                "#7c3aed") }.ToMessageBody();

            await SendAsync(message, username, password, smtp);
            _logger.LogInformation("Password reset OTP dispatched → {Email}", toEmail);
        }

        // ── Account Deactivated ──────────────────────────────────────────────────

        public async Task SendAccountDeactivatedEmailAsync(string toEmail, string toName)
        {
            if (!IsConfigured(out var username, out var password, out var smtp))
            {
                _logger.LogWarning(
                    "⚠️  SMTP not configured — would have sent deactivation notice to {Email}",
                    toEmail);
                return;
            }

            var message = new MimeMessage();
            message.From.Add(FromAddress(smtp, username));
            message.To.Add(new MailboxAddress(toName, toEmail));
            message.Subject = "Your InStore Optima account has been deactivated";

            var html = $"""
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"/></head>
                <body style="margin:0;padding:32px 16px;background:#0a0f1e;font-family:'Segoe UI',Inter,sans-serif;">
                  <div style="max-width:460px;margin:0 auto;background:#060b18;border-radius:14px;overflow:hidden;border:1px solid rgba(239,68,68,0.25);box-shadow:0 8px 40px rgba(0,0,0,0.4)">
                    <div style="background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);padding:28px 36px;text-align:center;">
                      <p style="margin:0;font-size:20px;font-weight:800;color:#fff;letter-spacing:-.02em;">InStore Optima</p>
                      <p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,.7);letter-spacing:.12em;text-transform:uppercase;">Account Deactivated</p>
                    </div>
                    <div style="padding:36px;">
                      <p style="margin:0 0 8px;font-size:15px;color:#e2e8f0;">Hi <strong>{toName}</strong>,</p>
                      <p style="margin:0 0 20px;font-size:13px;color:#94a3b8;line-height:1.7;">
                        Your InStore Optima account has been <strong style="color:#f87171;">deactivated</strong> by an administrator.
                        You will no longer be able to sign in.
                      </p>
                      <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.7;">
                        If you believe this is a mistake, please contact your system administrator or reply to this email.
                      </p>
                    </div>
                    <div style="border-top:1px solid rgba(255,255,255,.05);padding:14px 36px;text-align:center;">
                      <p style="margin:0;font-size:11px;color:#334155;">© 2026 InStore Optima · Automated security email — do not reply</p>
                    </div>
                  </div>
                </body>
                </html>
                """;

            message.Body = new BodyBuilder { HtmlBody = html }.ToMessageBody();
            await SendAsync(message, username, password, smtp);
            _logger.LogInformation("Account deactivation email dispatched → {Email}", toEmail);
        }

        // ── Contact Support ──────────────────────────────────────────────────────

        public async Task SendContactSupportEmailAsync(string fromName, string fromEmail, string userMessage)
        {
            if (!IsConfigured(out var username, out var password, out var smtp))
            {
                _logger.LogWarning(
                    "⚠️  SMTP not configured — Support message from {Name} ({Email}): {Message}",
                    fromName, fromEmail, userMessage);
                return;
            }

            var toEmail = smtp["FromEmail"] ?? username;

            var message = new MimeMessage();
            message.From.Add(FromAddress(smtp, username));
            message.To.Add(new MailboxAddress("InStore Optima Support", toEmail));
            message.ReplyTo.Add(new MailboxAddress(fromName, fromEmail));
            message.Subject = $"[Support Request] from {fromName}";

            var html = $"""
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"/></head>
                <body style="margin:0;padding:32px 16px;background:#0a0f1e;font-family:'Segoe UI',Inter,sans-serif;">
                  <div style="max-width:500px;margin:0 auto;background:#060b18;border-radius:14px;overflow:hidden;border:1px solid rgba(8,145,178,0.25);box-shadow:0 8px 40px rgba(0,0,0,0.4)">
                    <div style="background:linear-gradient(135deg,#0891b2 0%,#0e7490 100%);padding:28px 36px;text-align:center;">
                      <p style="margin:0;font-size:20px;font-weight:800;color:#fff;letter-spacing:-.02em;">InStore Optima</p>
                      <p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,.7);letter-spacing:.12em;text-transform:uppercase;">Support Request</p>
                    </div>
                    <div style="padding:36px;">
                      <div style="margin-bottom:20px;padding:16px;background:#0f1e35;border-radius:8px;border:1px solid rgba(8,145,178,.2)">
                        <p style="margin:0 0 6px;font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:.1em;">From</p>
                        <p style="margin:0;font-size:14px;color:#e2e8f0;font-weight:600;">{fromName}</p>
                        <p style="margin:2px 0 0;font-size:12px;color:#22d3ee;">{fromEmail}</p>
                      </div>
                      <div style="padding:16px;background:#0f1e35;border-radius:8px;border:1px solid rgba(8,145,178,.2)">
                        <p style="margin:0 0 10px;font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:.1em;">Message</p>
                        <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.8;white-space:pre-wrap;">{userMessage.Replace("&","&amp;").Replace("<","&lt;").Replace(">","&gt;")}</p>
                      </div>
                    </div>
                    <div style="border-top:1px solid rgba(255,255,255,.05);padding:14px 36px;text-align:center;">
                      <p style="margin:0;font-size:11px;color:#334155;">© 2026 InStore Optima · Reply to this email to respond to the user</p>
                    </div>
                  </div>
                </body>
                </html>
                """;

            message.Body = new BodyBuilder { HtmlBody = html }.ToMessageBody();
            await SendAsync(message, username, password, smtp);
            _logger.LogInformation("Support message from {Email} forwarded to inbox", fromEmail);
        }

        // ── Shared HTML template for OTP emails ─────────────────────────────────

        private static string OtpHtml(string toName, string otp, string title, string body, string accentColor) => $"""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"/></head>
            <body style="margin:0;padding:32px 16px;background:#0a0f1e;font-family:'Segoe UI',Inter,sans-serif;">
              <div style="max-width:460px;margin:0 auto;background:#060b18;border-radius:14px;overflow:hidden;border:1px solid rgba(8,145,178,0.25);box-shadow:0 8px 40px rgba(0,0,0,0.4)">
                <div style="background:linear-gradient(135deg,{accentColor} 0%,{accentColor}cc 100%);padding:28px 36px;text-align:center;">
                  <p style="margin:0;font-size:20px;font-weight:800;color:#fff;letter-spacing:-.02em;">InStore Optima</p>
                  <p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,.7);letter-spacing:.12em;text-transform:uppercase;">{title}</p>
                </div>
                <div style="padding:36px;">
                  <p style="margin:0 0 8px;font-size:15px;color:#e2e8f0;">Hi <strong>{toName}</strong>,</p>
                  <p style="margin:0 0 28px;font-size:13px;color:#94a3b8;line-height:1.7;">
                    {body} It expires in <strong style="color:#22d3ee;">10 minutes</strong>.
                  </p>
                  <div style="background:#0f1e35;border:1px solid rgba(8,145,178,.35);border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
                    <p style="margin:0 0 6px;font-size:11px;color:#475569;letter-spacing:.1em;text-transform:uppercase;">Your verification code</p>
                    <p style="margin:0;font-size:46px;font-weight:800;letter-spacing:14px;color:#22d3ee;font-family:'Courier New',monospace;">{otp}</p>
                  </div>
                  <p style="margin:0;font-size:12px;color:#475569;line-height:1.7;">
                    Do <strong>not</strong> share this code with anyone.
                  </p>
                </div>
                <div style="border-top:1px solid rgba(255,255,255,.05);padding:14px 36px;text-align:center;">
                  <p style="margin:0;font-size:11px;color:#334155;">© 2026 InStore Optima · Automated security email — do not reply</p>
                </div>
              </div>
            </body>
            </html>
            """;
    }
}
