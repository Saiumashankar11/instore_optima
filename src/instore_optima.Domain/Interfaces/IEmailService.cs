namespace instore_optima.Domain.Interfaces
{
    public interface IEmailService
    {
        Task SendOtpEmailAsync(string toEmail, string toName, string otp);
    }
}
