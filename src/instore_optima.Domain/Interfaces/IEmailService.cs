// IEmailService — contract for outbound transactional emails.
// Implementations (e.g. SendGrid, SMTP) send emails triggered by domain events
// such as MFA verification, password resets, account deactivation, and support requests.
namespace instore_optima.Domain.Interfaces
{
    public interface IEmailService
    {
        /// <summary>Sends an email containing a one-time password (OTP) for MFA/login verification.</summary>
        Task SendOtpEmailAsync(string toEmail, string toName, string otp);

        /// <summary>Sends an email containing an OTP specifically for the "forgot password" reset flow.</summary>
        Task SendPasswordResetOtpEmailAsync(string toEmail, string toName, string otp);

        /// <summary>Notifies a user that their account has been deactivated by an administrator.</summary>
        Task SendAccountDeactivatedEmailAsync(string toEmail, string toName);

        /// <summary>
        /// Forwards a contact-support message from a user to the support inbox.
        /// <paramref name="fromName"/> and <paramref name="fromEmail"/> identify the sender.
        /// </summary>
        Task SendContactSupportEmailAsync(string fromName, string fromEmail, string message);
    }
}
