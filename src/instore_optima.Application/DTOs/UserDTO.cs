using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

// DTOs — request/response shapes for all authentication, user-management, and support flows.
// These DTOs are used by the /api/auth/* and /api/support/* endpoints.
namespace instore_optima.Application.DTOs
{
    //---Login/Request---
    // Request body for POST /api/auth/login — supplies credentials; may trigger an OTP challenge.
    public class LoginDto
    {
        [Required(ErrorMessage = "Email is required.")]
        [RegularExpression(
            @"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$",
            ErrorMessage = "Enter a valid email address (e.g. name@example.com).")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required.")]
        public string Password { get; set; } = string.Empty;
    }

    //---Register/Update---
    // Request body for POST /api/auth/register — creates a new user account.
    public class RegisterDto
    {
        [Required(ErrorMessage = "Name is required.")]
        [StringLength(100, MinimumLength = 2, ErrorMessage = "Name must be between 2 and 100 characters.")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email is required.")]
        [RegularExpression(
            @"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$",
            ErrorMessage = "Enter a valid email address (e.g. name@example.com).")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required.")]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters.")]
        [RegularExpression(
            @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$",
            ErrorMessage = "Password must contain at least one uppercase letter, one lowercase letter, and one number.")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "Role is required.")]
        [RegularExpression(
            @"^(Admin|Manager|Staff)$",
            ErrorMessage = "Role must be one of: Admin, Manager, Staff.")]
        public string Role { get; set; } = string.Empty; // access level: "Admin", "Manager", or "Staff"
    }

    //---Response---
    // Response body on successful login (no OTP required) or after OTP verification succeeds.
    public class AuthResponseDto
    {
        public int UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;  // JWT bearer token — include in Authorization header for subsequent requests
        public DateTime? CreatedAt { get; set; }
    }

    // Returned from POST /api/auth/login — signals the client to show OTP input
    public class OtpChallengeDto
    {
        public bool RequiresOtp      { get; set; } = true;
        public bool IsTotpChallenge  { get; set; } = false;  // true when user has TOTP app enabled — client should show authenticator-app prompt instead of email OTP input
        public string SessionKey     { get; set; } = string.Empty; // GUID that ties this challenge to the user's browser session; must be echoed back in VerifyOtpDto
        public string MaskedEmail    { get; set; } = string.Empty; // partially hidden email shown to user so they know where the code was sent, e.g. "j***@example.com"
    }

    // Sent by client to POST /api/auth/verify-otp
    public class VerifyOtpDto
    {
        [Required(ErrorMessage = "Session key is required.")]
        public string SessionKey { get; set; } = string.Empty;

        [Required(ErrorMessage = "Verification code is required.")]
        [StringLength(6, MinimumLength = 6, ErrorMessage = "Code must be exactly 6 digits.")]
        public string Otp { get; set; } = string.Empty;
    }

    // Sent by client to POST /api/auth/resend-otp
    public class ResendOtpDto
    {
        [Required]
        public string SessionKey { get; set; } = string.Empty;
    }

    // POST /api/auth/forgot-password
    public class ForgotPasswordDto
    {
        [Required(ErrorMessage = "Email is required.")]
        [RegularExpression(
            @"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$",
            ErrorMessage = "Enter a valid email address.")]
        public string Email { get; set; } = string.Empty;
    }

    // POST /api/auth/reset-password
    public class ResetPasswordDto
    {
        [Required]
        public string SessionKey { get; set; } = string.Empty;

        [Required]
        [StringLength(6, MinimumLength = 6, ErrorMessage = "Code must be exactly 6 digits.")]
        public string Otp { get; set; } = string.Empty;

        [Required(ErrorMessage = "New password is required.")]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters.")]
        [RegularExpression(
            @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$",
            ErrorMessage = "Password must contain uppercase, lowercase, and a number.")]
        public string NewPassword { get; set; } = string.Empty;
    }

    // POST /api/auth/change-password [Authorize]
    public class ChangePasswordDto
    {
        [Required(ErrorMessage = "Current password is required.")]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "New password is required.")]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters.")]
        [RegularExpression(
            @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$",
            ErrorMessage = "Password must contain uppercase, lowercase, and a number.")]
        public string NewPassword { get; set; } = string.Empty;
    }

    // POST /api/auth/totp/enable [Authorize]
    public class TotpEnableDto
    {
        [Required]
        public string Secret { get; set; } = string.Empty;

        [Required]
        [StringLength(6, MinimumLength = 6)]
        public string Code { get; set; } = string.Empty;
    }

    // POST /api/auth/totp/disable [Authorize]
    public class TotpDisableDto
    {
        [Required]
        public string Password { get; set; } = string.Empty;
    }

    // Response from GET /api/auth/totp/setup — gives the client everything needed to configure an authenticator app.
    public class TotpSetupResponseDto
    {
        public string Secret    { get; set; } = string.Empty;    // base-32 TOTP secret key — stored by the authenticator app
        public string QrCodeUri { get; set; } = string.Empty;   // otpauth:// URI encoded as a QR code image (data URL) for scanning
        public string ManualKey { get; set; } = string.Empty;   // human-readable version of Secret for users who cannot scan a QR code
    }

    // Response from GET /api/auth/profile — returns the currently authenticated user's details.
    public class UserProfileDto
    {
        public int UserId          { get; set; }
        public string Name         { get; set; } = string.Empty;
        public string Email        { get; set; } = string.Empty;
        public string Role         { get; set; } = string.Empty; // "Admin", "Manager", or "Staff"
        public DateTime? CreatedAt { get; set; }
        public bool TotpEnabled    { get; set; }                 // whether the user has an authenticator app configured
        public string? PhoneNumber { get; set; }                 // optional; null if not set
        public string? Address     { get; set; }                 // optional; null if not set
    }

    // PUT /api/auth/profile [Authorize]
    public class UpdateProfileDto
    {
        [Required(ErrorMessage = "Name is required.")]
        [StringLength(100, MinimumLength = 2, ErrorMessage = "Name must be between 2 and 100 characters.")]
        public string Name { get; set; } = string.Empty;

        [StringLength(20, ErrorMessage = "Phone number too long.")]
        public string? PhoneNumber { get; set; }

        [StringLength(300, ErrorMessage = "Address too long.")]
        public string? Address { get; set; }
    }

    // POST /api/support/contact — sends a help/feedback message from a user (or visitor) to the support team.
    public class ContactSupportDto
    {
        [Required(ErrorMessage = "Name is required.")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email is required.")]
        [RegularExpression(
            @"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$",
            ErrorMessage = "Enter a valid email address.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Message is required.")]
        [StringLength(2000, MinimumLength = 10, ErrorMessage = "Message must be between 10 and 2000 characters.")]
        public string Message { get; set; } = string.Empty;
    }
}
