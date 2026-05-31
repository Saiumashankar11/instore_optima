using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Application.DTOs
{
    //---Login/Request---
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
        public string Role { get; set; } = string.Empty;
    }

    //---Response---
    public class AuthResponseDto
    {
        public int UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public DateTime? CreatedAt { get; set; }
    }

    // Returned from POST /api/auth/login — signals the client to show OTP input
    public class OtpChallengeDto
    {
        public bool RequiresOtp   { get; set; } = true;
        public string SessionKey  { get; set; } = string.Empty;   // GUID to correlate OTP → JWT exchange
        public string MaskedEmail { get; set; } = string.Empty;   // e.g. s***@gmail.com (shown in UI)
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
}
