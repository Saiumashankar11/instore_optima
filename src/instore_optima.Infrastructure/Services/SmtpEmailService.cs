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

        public async Task SendOtpEmailAsync(string toEmail, string toName, string otp)
        {
            var smtp     = _config.GetSection("Smtp");
            var username = smtp["Username"] ?? string.Empty;
            var password = smtp["Password"] ?? string.Empty;

            // ── Dev / unconfigured fallback ─────────────────────────────────
            // If SMTP credentials are still placeholder values or empty,
            // print the OTP to the console so development/testing still works.
            bool isConfigured = !string.IsNullOrWhiteSpace(username)
                             && !username.Contains("your-gmail")
                             && !string.IsNullOrWhiteSpace(password)
                             && !password.Contains("xxxx");

            if (!isConfigured)
            {
                _logger.LogWarning(
                    "⚠️  SMTP not configured — OTP for {Email} is: {Otp}  (set Smtp:Username + Smtp:Password in appsettings.json to send real emails)",
                    toEmail, otp);
                // Return without throwing so login still works during dev
                return;
            }

            // ── Real SMTP send ──────────────────────────────────────────────
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(
                smtp["FromName"]  ?? "InStore Optima",
                smtp["FromEmail"] ?? username));
            message.To.Add(new MailboxAddress(toName, toEmail));
            message.Subject = $"Your InStore Optima sign-in code: {otp}";

            var html = $"""
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"/></head>
                <body style="margin:0;padding:32px 16px;background:#0a0f1e;font-family:'Segoe UI',Inter,sans-serif;">
                  <div style="max-width:460px;margin:0 auto;background:#060b18;border-radius:14px;overflow:hidden;border:1px solid rgba(8,145,178,0.25);box-shadow:0 8px 40px rgba(0,0,0,0.4)">

                    <!-- Header -->
                    <div style="background:linear-gradient(135deg,#0891b2 0%,#0e7490 100%);padding:28px 36px;text-align:center;">
                      <p style="margin:0;font-size:20px;font-weight:800;color:#fff;letter-spacing:-.02em;">InStore Optima</p>
                      <p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,.7);letter-spacing:.12em;text-transform:uppercase;">Two-Factor Verification</p>
                    </div>

                    <!-- Body -->
                    <div style="padding:36px;">
                      <p style="margin:0 0 8px;font-size:15px;color:#e2e8f0;">Hi <strong>{toName}</strong>,</p>
                      <p style="margin:0 0 28px;font-size:13px;color:#94a3b8;line-height:1.7;">
                        Someone (hopefully you) is signing in to InStore Optima.
                        Enter the code below to complete sign-in. It expires in
                        <strong style="color:#22d3ee;">10 minutes</strong>.
                      </p>

                      <!-- OTP box -->
                      <div style="background:#0f1e35;border:1px solid rgba(8,145,178,.35);border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
                        <p style="margin:0 0 6px;font-size:11px;color:#475569;letter-spacing:.1em;text-transform:uppercase;">Your verification code</p>
                        <p style="margin:0;font-size:46px;font-weight:800;letter-spacing:14px;color:#22d3ee;font-family:'Courier New',monospace;">{otp}</p>
                      </div>

                      <p style="margin:0;font-size:12px;color:#475569;line-height:1.7;">
                        If you didn't attempt to sign in, please ignore this email — your account is safe.
                        Do <strong>not</strong> share this code with anyone.
                      </p>
                    </div>

                    <!-- Footer -->
                    <div style="border-top:1px solid rgba(255,255,255,.05);padding:14px 36px;text-align:center;">
                      <p style="margin:0;font-size:11px;color:#334155;">
                        © 2026 InStore Optima &nbsp;·&nbsp; Automated security email — do not reply
                      </p>
                    </div>

                  </div>
                </body>
                </html>
                """;

            var body = new BodyBuilder { HtmlBody = html };
            message.Body = body.ToMessageBody();

            using var client = new SmtpClient();
            await client.ConnectAsync(
                smtp["Host"]!,
                int.Parse(smtp["Port"] ?? "587"),
                SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(username, password);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("OTP email dispatched → {Email}", toEmail);
        }
    }
}
