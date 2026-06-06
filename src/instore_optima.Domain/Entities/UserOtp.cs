namespace instore_optima.Domain.Entities
{
    // DB Entity — a one-time password (OTP) record used for multi-factor authentication flows.
    // Created when a user logs in (email OTP challenge), resets their password, or sets up TOTP.
    // Each row is single-use; once consumed (IsUsed = true) or expired it cannot be reused.
    public class UserOtp
    {
        public int Id            { get; set; }
        public int UserId        { get; set; }                              // FK → User who this OTP was issued to
        public string OtpCode    { get; set; } = string.Empty;             // the 6-digit verification code sent to the user
        public string SessionKey { get; set; } = string.Empty;   // GUID — ties OTP to a browser session
        public DateTime ExpiresAt { get; set; }                            // after this time the OTP is invalid even if unused
        public bool IsUsed       { get; set; } = false;                    // set to true once the code has been successfully verified
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;        // when this OTP was generated
        // "login" | "reset" | "totp"
        public string Purpose    { get; set; } = "login";                  // which authentication flow this OTP belongs to
    }
}
