using instore_optima.Application.DTOs;
using instore_optima.Domain.Entities;
using instore_optima.Domain.Interfaces;
using instore_optima.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OtpNet;
using instore_optima.Api.Exceptions;
using System.Security.Claims;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : BaseApiController
    {
        private readonly IAuthRepository  _authRepository;
        private readonly IEmailService    _emailService;
        private readonly AppDbContext     _context;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            IAuthRepository authRepository,
            IEmailService emailService,
            AppDbContext context,
            ILogger<AuthController> logger)
        {
            _authRepository = authRepository;
            _emailService   = emailService;
            _context        = context;
            _logger         = logger;
        }

        // ── Register ──────────────────────────────────────────────────────────
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            ValidateModelState();

            var existingUser = await _authRepository.GetUserByEmailAsync(dto.Email);
            if (existingUser != null)
                throw new ValidationException(new Dictionary<string, string[]>
                    { { "Email", new[] { "Email already registered" } } });

            var user = new User
            {
                Name      = dto.Name,
                Email     = dto.Email,
                Password  = _authRepository.HashPassword(dto.Password),
                Role      = dto.Role,
                CreatedAt = DateTime.UtcNow
            };

            var created = await _authRepository.RegisterAsync(user);
            _logger.LogInformation("New user registered — {Name} ({Email}) with role {Role}",
                created.Name, created.Email, created.Role);

            await _authRepository.LogAuditAsync(created.UserId, "Register", "User", created.UserId);

            return StatusCode(201, new AuthResponseDto
            {
                UserId = created.UserId,
                Name   = created.Name,
                Email  = created.Email,
                Role   = created.Role,
                Token  = string.Empty
            });
        }

        // ── Step 1 — Validate credentials → send OTP or TOTP challenge ────────
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            ValidateModelState();

            var user = await _authRepository.GetUserByEmailAsync(dto.Email);
            if (user == null)
            {
                _logger.LogWarning("Failed login — unknown email {Email}", dto.Email);
                throw new UnauthorizedAccessException("Invalid email or password.");
            }

            if (user.Role == "Inactive")
            {
                _logger.LogWarning("Login blocked — deactivated account {Email}", dto.Email);
                throw new UnauthorizedAccessException("This account has been deactivated. Contact an administrator.");
            }

            if (!_authRepository.VerifyPassword(dto.Password, user.Password))
            {
                _logger.LogWarning("Failed login — wrong password for {Email}", dto.Email);
                throw new UnauthorizedAccessException("Invalid email or password.");
            }

            // Clean up any previous OTPs for this user
            var staleOtps = _context.UserOtps.Where(o => o.UserId == user.UserId && !o.IsUsed);
            _context.UserOtps.RemoveRange(staleOtps);

            var sessionKey = Guid.NewGuid().ToString("N");

            if (user.TotpEnabled && !string.IsNullOrEmpty(user.TotpSecret))
            {
                // TOTP challenge — no email sent; app generates the code
                _context.UserOtps.Add(new UserOtp
                {
                    UserId     = user.UserId,
                    OtpCode    = string.Empty,
                    SessionKey = sessionKey,
                    ExpiresAt  = DateTime.UtcNow.AddMinutes(3),
                    IsUsed     = false,
                    CreatedAt  = DateTime.UtcNow,
                    Purpose    = "totp"
                });
                await _context.SaveChangesAsync();

                _logger.LogInformation("TOTP challenge issued for {Email}", user.Email);

                return Ok(new OtpChallengeDto
                {
                    RequiresOtp     = true,
                    IsTotpChallenge = true,
                    SessionKey      = sessionKey,
                    MaskedEmail     = MaskEmail(user.Email)
                });
            }

            // Email OTP challenge
            var otp = Random.Shared.Next(100_000, 1_000_000).ToString("D6");

            _context.UserOtps.Add(new UserOtp
            {
                UserId     = user.UserId,
                OtpCode    = otp,
                SessionKey = sessionKey,
                ExpiresAt  = DateTime.UtcNow.AddMinutes(3),
                IsUsed     = false,
                CreatedAt  = DateTime.UtcNow,
                Purpose    = "login"
            });
            await _context.SaveChangesAsync();

            try
            {
                await _emailService.SendOtpEmailAsync(user.Email, user.Name, otp);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SMTP delivery failed for {Email}", user.Email);
                var failed = await _context.UserOtps.FirstOrDefaultAsync(o => o.SessionKey == sessionKey);
                if (failed != null) _context.UserOtps.Remove(failed);
                await _context.SaveChangesAsync();
                return StatusCode(502, new { message = "We couldn't send the verification email. Your network may be blocking email delivery — try a different network (e.g. mobile hotspot) or contact your administrator." });
            }

            _logger.LogInformation("Email OTP challenge issued for {Email}", user.Email);

            return Ok(new OtpChallengeDto
            {
                RequiresOtp     = true,
                IsTotpChallenge = false,
                SessionKey      = sessionKey,
                MaskedEmail     = MaskEmail(user.Email)
            });
        }

        // ── Switch TOTP session → email OTP ──────────────────────────────────
        [HttpPost("switch-to-email-otp")]
        public async Task<IActionResult> SwitchToEmailOtp([FromBody] ResendOtpDto dto)
        {
            var record = await _context.UserOtps
                .FirstOrDefaultAsync(o => o.SessionKey == dto.SessionKey && o.Purpose == "totp" && !o.IsUsed);

            if (record == null)
                throw new UnauthorizedAccessException("Session not found or already used. Please sign in again.");

            var user = await _context.Users.FindAsync(record.UserId)
                ?? throw new UnauthorizedAccessException("User not found.");

            // Replace TOTP session with an email OTP session
            _context.UserOtps.Remove(record);

            var otp        = Random.Shared.Next(100_000, 1_000_000).ToString("D6");
            var sessionKey = Guid.NewGuid().ToString("N");

            _context.UserOtps.Add(new UserOtp
            {
                UserId     = user.UserId,
                OtpCode    = otp,
                SessionKey = sessionKey,
                ExpiresAt  = DateTime.UtcNow.AddMinutes(3),
                IsUsed     = false,
                CreatedAt  = DateTime.UtcNow,
                Purpose    = "login"
            });
            await _context.SaveChangesAsync();

            try
            {
                await _emailService.SendOtpEmailAsync(user.Email, user.Name, otp);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SMTP failed during TOTP→email switch for {Email}", user.Email);
                return StatusCode(502, new { message = "We couldn't send the verification email. Your network may be blocking email delivery — try a different network (e.g. mobile hotspot) or contact your administrator." });
            }

            _logger.LogInformation("Switched from TOTP to email OTP for {Email}", user.Email);

            return Ok(new { sessionKey, maskedEmail = MaskEmail(user.Email) });
        }

        // ── Step 2 — Verify OTP (email or TOTP) → issue JWT ──────────────────
        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpDto dto)
        {
            ValidateModelState();

            var record = await _context.UserOtps
                .FirstOrDefaultAsync(o =>
                    o.SessionKey == dto.SessionKey &&
                    !o.IsUsed &&
                    o.ExpiresAt > DateTime.UtcNow);

            if (record == null)
                throw new UnauthorizedAccessException("Verification code has expired or is invalid. Please sign in again.");

            var user = await _context.Users.FindAsync(record.UserId)
                ?? throw new UnauthorizedAccessException("User not found.");

            if (record.Purpose == "totp")
            {
                // Validate against user's TOTP secret
                if (string.IsNullOrEmpty(user.TotpSecret))
                    throw new UnauthorizedAccessException("Authenticator not configured. Please sign in again.");

                var totp = new Totp(Base32Encoding.ToBytes(user.TotpSecret));
                bool totpValid = totp.VerifyTotp(dto.Otp, out _, new VerificationWindow(2, 2));

                if (!totpValid)
                    throw new UnauthorizedAccessException("Incorrect verification code. Please check your authenticator app.");
            }
            else
            {
                // Validate email OTP code
                if (record.OtpCode != dto.Otp)
                    throw new UnauthorizedAccessException("Incorrect verification code. Please check your email and try again.");
            }

            record.IsUsed = true;
            await _context.SaveChangesAsync();

            var token = _authRepository.GenerateJwtToken(user);

            _logger.LogInformation("User {Name} ({Email}) completed 2FA login with role {Role}",
                user.Name, user.Email, user.Role);

            await _authRepository.LogAuditAsync(user.UserId, "Login", "User", user.UserId);

            return Ok(new AuthResponseDto
            {
                UserId = user.UserId,
                Name   = user.Name,
                Email  = user.Email,
                Role   = user.Role,
                Token  = token
            });
        }

        // ── Resend OTP (preserves purpose) ────────────────────────────────────
        [HttpPost("resend-otp")]
        public async Task<IActionResult> ResendOtp([FromBody] ResendOtpDto dto)
        {
            var old = await _context.UserOtps
                .FirstOrDefaultAsync(o => o.SessionKey == dto.SessionKey);

            if (old == null)
                throw new UnauthorizedAccessException("Session not found. Please sign in again.");

            if (old.Purpose == "totp")
                return BadRequest(new { message = "TOTP codes are generated by your authenticator app." });

            var user = await _context.Users.FindAsync(old.UserId)
                ?? throw new UnauthorizedAccessException("User not found.");

            var oldPurpose = old.Purpose;
            _context.UserOtps.Remove(old);

            var otp        = Random.Shared.Next(100_000, 1_000_000).ToString("D6");
            var sessionKey = Guid.NewGuid().ToString("N");

            _context.UserOtps.Add(new UserOtp
            {
                UserId     = user.UserId,
                OtpCode    = otp,
                SessionKey = sessionKey,
                ExpiresAt  = DateTime.UtcNow.AddMinutes(3),
                IsUsed     = false,
                CreatedAt  = DateTime.UtcNow,
                Purpose    = oldPurpose
            });
            await _context.SaveChangesAsync();

            try
            {
                if (oldPurpose == "reset")
                    await _emailService.SendPasswordResetOtpEmailAsync(user.Email, user.Name, otp);
                else
                    await _emailService.SendOtpEmailAsync(user.Email, user.Name, otp);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SMTP resend failed for {Email}", user.Email);
                return StatusCode(502, new { message = "We couldn't send the verification email. Your network may be blocking email delivery — try a different network (e.g. mobile hotspot) or contact your administrator." });
            }

            _logger.LogInformation("OTP resent for {Email} (purpose: {Purpose})", user.Email, oldPurpose);

            return Ok(new { sessionKey, maskedEmail = MaskEmail(user.Email) });
        }

        // ── Forgot Password ───────────────────────────────────────────────────
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            ValidateModelState();

            // Always return success to prevent user enumeration
            var user = await _authRepository.GetUserByEmailAsync(dto.Email);
            if (user == null || user.Role == "Inactive")
            {
                _logger.LogInformation("Forgot-password requested for unknown/inactive email {Email}", dto.Email);
                return Ok(new { message = "If that email exists, a reset code has been sent." });
            }

            // Remove any existing reset OTPs for this user
            var staleResets = _context.UserOtps.Where(o => o.UserId == user.UserId && o.Purpose == "reset");
            _context.UserOtps.RemoveRange(staleResets);

            var otp        = Random.Shared.Next(100_000, 1_000_000).ToString("D6");
            var sessionKey = Guid.NewGuid().ToString("N");

            _context.UserOtps.Add(new UserOtp
            {
                UserId     = user.UserId,
                OtpCode    = otp,
                SessionKey = sessionKey,
                ExpiresAt  = DateTime.UtcNow.AddMinutes(3),
                IsUsed     = false,
                CreatedAt  = DateTime.UtcNow,
                Purpose    = "reset"
            });
            await _context.SaveChangesAsync();

            try
            {
                await _emailService.SendPasswordResetOtpEmailAsync(user.Email, user.Name, otp);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SMTP failed for password reset {Email}", user.Email);
                return StatusCode(502, new { message = "We couldn't send the reset email. Your network may be blocking email delivery — try a different network or contact your administrator." });
            }

            _logger.LogInformation("Password reset OTP issued for {Email}", user.Email);

            return Ok(new { sessionKey, maskedEmail = MaskEmail(user.Email) });
        }

        // ── Reset Password ────────────────────────────────────────────────────
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            ValidateModelState();

            var record = await _context.UserOtps
                .FirstOrDefaultAsync(o =>
                    o.SessionKey == dto.SessionKey &&
                    o.Purpose    == "reset" &&
                    !o.IsUsed &&
                    o.ExpiresAt > DateTime.UtcNow);

            if (record == null)
                throw new UnauthorizedAccessException("Reset code has expired or is invalid. Please start over.");

            if (record.OtpCode != dto.Otp)
                throw new UnauthorizedAccessException("Incorrect reset code.");

            var user = await _context.Users.FindAsync(record.UserId)
                ?? throw new UnauthorizedAccessException("User not found.");

            record.IsUsed  = true;
            user.Password  = _authRepository.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Password reset completed for {Email}", user.Email);

            return Ok(new { message = "Password updated successfully. You can now sign in." });
        }

        // ── Get Profile ───────────────────────────────────────────────────────
        [HttpGet("profile")]
        [Authorize]
        public async Task<IActionResult> GetProfile()
        {
            var userId = GetCurrentUserId();
            var user   = await _context.Users.FindAsync(userId)
                ?? throw new UnauthorizedAccessException("User not found.");

            return Ok(new UserProfileDto
            {
                UserId      = user.UserId,
                Name        = user.Name,
                Email       = user.Email,
                Role        = user.Role,
                CreatedAt   = user.CreatedAt,
                TotpEnabled = user.TotpEnabled,
                PhoneNumber = user.PhoneNumber,
                Address     = user.Address
            });
        }

        // ── Update Profile ────────────────────────────────────────────────────
        [HttpPut("profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            ValidateModelState();

            var userId = GetCurrentUserId();
            var user   = await _context.Users.FindAsync(userId)
                ?? throw new UnauthorizedAccessException("User not found.");

            user.Name        = dto.Name.Trim();
            user.PhoneNumber = string.IsNullOrWhiteSpace(dto.PhoneNumber) ? null : dto.PhoneNumber.Trim();
            user.Address     = string.IsNullOrWhiteSpace(dto.Address)     ? null : dto.Address.Trim();
            await _context.SaveChangesAsync();

            _logger.LogInformation("Profile updated for {Email}", user.Email);

            return Ok(new UserProfileDto
            {
                UserId      = user.UserId,
                Name        = user.Name,
                Email       = user.Email,
                Role        = user.Role,
                CreatedAt   = user.CreatedAt,
                TotpEnabled = user.TotpEnabled,
                PhoneNumber = user.PhoneNumber,
                Address     = user.Address
            });
        }

        // ── Change Password ───────────────────────────────────────────────────
        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            ValidateModelState();

            var userId = GetCurrentUserId();
            var user   = await _context.Users.FindAsync(userId)
                ?? throw new UnauthorizedAccessException("User not found.");

            if (!_authRepository.VerifyPassword(dto.CurrentPassword, user.Password))
                throw new ValidationException(new Dictionary<string, string[]>
                    { { "CurrentPassword", new[] { "Current password is incorrect." } } });

            user.Password = _authRepository.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Password changed for {Email}", user.Email);
            return Ok(new { message = "Password updated successfully." });
        }

        // ── TOTP Setup — returns secret + QR URI without saving ───────────────
        [HttpGet("totp/setup")]
        [Authorize]
        public async Task<IActionResult> TotpSetup()
        {
            var userId = GetCurrentUserId();
            var user   = await _context.Users.FindAsync(userId)
                ?? throw new UnauthorizedAccessException("User not found.");

            var secretBytes  = KeyGeneration.GenerateRandomKey(20);
            var base32Secret = Base32Encoding.ToString(secretBytes);
            var encodedEmail = Uri.EscapeDataString(user.Email);
            var qrCodeUri    = $"otpauth://totp/InStore%20Optima:{encodedEmail}?secret={base32Secret}&issuer=InStore%20Optima&digits=6&period=30";

            return Ok(new TotpSetupResponseDto
            {
                Secret    = base32Secret,
                QrCodeUri = qrCodeUri,
                ManualKey = FormatManualKey(base32Secret)
            });
        }

        // ── TOTP Enable — verify code and save secret ─────────────────────────
        [HttpPost("totp/enable")]
        [Authorize]
        public async Task<IActionResult> TotpEnable([FromBody] TotpEnableDto dto)
        {
            ValidateModelState();

            var userId = GetCurrentUserId();
            var user   = await _context.Users.FindAsync(userId)
                ?? throw new UnauthorizedAccessException("User not found.");

            byte[] keyBytes;
            try { keyBytes = Base32Encoding.ToBytes(dto.Secret); }
            catch { return BadRequest(new { message = "Invalid secret key." }); }

            var totp  = new Totp(keyBytes);
            bool valid = totp.VerifyTotp(dto.Code, out _, new VerificationWindow(2, 2));

            if (!valid)
                throw new ValidationException(new Dictionary<string, string[]>
                    { { "Code", new[] { "Code did not match. Make sure your authenticator app is scanning the right QR code." } } });

            user.TotpSecret  = dto.Secret;
            user.TotpEnabled = true;
            await _context.SaveChangesAsync();

            _logger.LogInformation("TOTP enabled for {Email}", user.Email);
            return Ok(new { message = "Authenticator app enabled successfully." });
        }

        // ── TOTP Disable — verify password first ──────────────────────────────
        [HttpPost("totp/disable")]
        [Authorize]
        public async Task<IActionResult> TotpDisable([FromBody] TotpDisableDto dto)
        {
            ValidateModelState();

            var userId = GetCurrentUserId();
            var user   = await _context.Users.FindAsync(userId)
                ?? throw new UnauthorizedAccessException("User not found.");

            if (!_authRepository.VerifyPassword(dto.Password, user.Password))
                throw new ValidationException(new Dictionary<string, string[]>
                    { { "Password", new[] { "Incorrect password." } } });

            user.TotpSecret  = null;
            user.TotpEnabled = false;
            await _context.SaveChangesAsync();

            _logger.LogInformation("TOTP disabled for {Email}", user.Email);
            return Ok(new { message = "Authenticator app disabled." });
        }

        // ── Ping ──────────────────────────────────────────────────────────────
        [HttpGet("ping")]
        [Authorize]
        public IActionResult Ping() => Ok(new { ok = true });

        // ── Helpers ───────────────────────────────────────────────────────────
        private static string MaskEmail(string email)
        {
            var at = email.IndexOf('@');
            if (at <= 1) return email;
            return email[0] + new string('*', Math.Max(0, at - 2)) + email[(at - 1)..];
        }

        private static string FormatManualKey(string base32)
        {
            // Format as XXXX XXXX XXXX ... groups of 4
            return string.Join(" ", Enumerable.Range(0, (base32.Length + 3) / 4)
                .Select(i => base32.Substring(i * 4, Math.Min(4, base32.Length - i * 4))));
        }

        private int GetCurrentUserId()
        {
            var idStr = User.FindFirstValue("userId");
            if (!int.TryParse(idStr, out int userId))
                throw new UnauthorizedAccessException("Invalid session.");
            return userId;
        }
    }
}
