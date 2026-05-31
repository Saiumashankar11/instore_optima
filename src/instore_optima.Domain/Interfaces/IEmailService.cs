namespace instore_optima.Domain.Interfaces
{
    public interface IEmailService
    {
        Task SendOtpEmailAsync(string toEmail, string toName, string otp);
        Task SendPasswordResetOtpEmailAsync(string toEmail, string toName, string otp);
        Task SendAccountDeactivatedEmailAsync(string toEmail, string toName);
        Task SendContactSupportEmailAsync(string fromName, string fromEmail, string message);
    }
}
