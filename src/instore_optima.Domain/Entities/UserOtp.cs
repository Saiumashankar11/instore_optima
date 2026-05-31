namespace instore_optima.Domain.Entities
{
    public class UserOtp
    {
        public int Id            { get; set; }
        public int UserId        { get; set; }
        public string OtpCode    { get; set; } = string.Empty;
        public string SessionKey { get; set; } = string.Empty;   // GUID — ties OTP to a browser session
        public DateTime ExpiresAt { get; set; }
        public bool IsUsed       { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
