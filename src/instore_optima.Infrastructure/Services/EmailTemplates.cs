namespace instore_optima.Infrastructure.Services
{
    /// <summary>
    /// Subject + HTML body for an email, shared by every transport (SMTP, Brevo, …).
    /// </summary>
    public readonly record struct EmailContent(string Subject, string Html);

    /// <summary>
    /// Centralised email markup so the SMTP and Brevo transports stay identical.
    /// </summary>
    public static class EmailTemplates
    {
        public static EmailContent LoginOtp(string toName, string otp) => new(
            $"Your InStore Optima sign-in code: {otp}",
            OtpHtml(toName, otp,
                "Two-Factor Verification",
                "Someone (hopefully you) is signing in to InStore Optima. Enter the code below to complete sign-in.",
                "#0891b2"));

        public static EmailContent ResetOtp(string toName, string otp) => new(
            $"Reset your InStore Optima password: {otp}",
            OtpHtml(toName, otp,
                "Password Reset",
                "You requested a password reset for your InStore Optima account. Enter the code below to set a new password. If you didn't request this, ignore this email.",
                "#7c3aed"));

        public static EmailContent Deactivated(string toName) => new(
            "Your InStore Optima account has been deactivated",
            $$"""
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
                  <p style="margin:0 0 8px;font-size:15px;color:#e2e8f0;">Hi <strong>{{toName}}</strong>,</p>
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
            """);

        public static EmailContent Support(string fromName, string fromEmail, string userMessage)
        {
            var safe = userMessage.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");
            var html = $$"""
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
                        <p style="margin:0;font-size:14px;color:#e2e8f0;font-weight:600;">{{fromName}}</p>
                        <p style="margin:2px 0 0;font-size:12px;color:#22d3ee;">{{fromEmail}}</p>
                      </div>
                      <div style="padding:16px;background:#0f1e35;border-radius:8px;border:1px solid rgba(8,145,178,.2)">
                        <p style="margin:0 0 10px;font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:.1em;">Message</p>
                        <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.8;white-space:pre-wrap;">{{safe}}</p>
                      </div>
                    </div>
                    <div style="border-top:1px solid rgba(255,255,255,.05);padding:14px 36px;text-align:center;">
                      <p style="margin:0;font-size:11px;color:#334155;">© 2026 InStore Optima · Reply to this email to respond to the user</p>
                    </div>
                  </div>
                </body>
                </html>
                """;
            return new($"[Support Request] from {fromName}", html);
        }

        // ── Shared OTP markup ───────────────────────────────────────────────────
        private static string OtpHtml(string toName, string otp, string title, string body, string accentColor) => $$"""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"/></head>
            <body style="margin:0;padding:32px 16px;background:#0a0f1e;font-family:'Segoe UI',Inter,sans-serif;">
              <div style="max-width:460px;margin:0 auto;background:#060b18;border-radius:14px;overflow:hidden;border:1px solid rgba(8,145,178,0.25);box-shadow:0 8px 40px rgba(0,0,0,0.4)">
                <div style="background:linear-gradient(135deg,{{accentColor}} 0%,{{accentColor}}cc 100%);padding:28px 36px;text-align:center;">
                  <p style="margin:0;font-size:20px;font-weight:800;color:#fff;letter-spacing:-.02em;">InStore Optima</p>
                  <p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,.7);letter-spacing:.12em;text-transform:uppercase;">{{title}}</p>
                </div>
                <div style="padding:36px;">
                  <p style="margin:0 0 8px;font-size:15px;color:#e2e8f0;">Hi <strong>{{toName}}</strong>,</p>
                  <p style="margin:0 0 28px;font-size:13px;color:#94a3b8;line-height:1.7;">
                    {{body}} It expires in <strong style="color:#22d3ee;">3 minutes</strong>.
                  </p>
                  <div style="background:#0f1e35;border:1px solid rgba(8,145,178,.35);border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
                    <p style="margin:0 0 6px;font-size:11px;color:#475569;letter-spacing:.1em;text-transform:uppercase;">Your verification code</p>
                    <p style="margin:0;font-size:46px;font-weight:800;letter-spacing:14px;color:#22d3ee;font-family:'Courier New',monospace;">{{otp}}</p>
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
