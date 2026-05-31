using instore_optima.Application.DTOs;
using instore_optima.Domain.Entities;
using instore_optima.Domain.Interfaces;
using instore_optima.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using instore_optima.Api.Exceptions;

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

        // ── Step 1 — Validate credentials → send OTP email ───────────────────
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

            // Invalidate any previous unused OTPs for this user
            var staleOtps = _context.UserOtps.Where(o => o.UserId == user.UserId && !o.IsUsed);
            _context.UserOtps.RemoveRange(staleOtps);

            // Generate 6-digit OTP + opaque session key
            var otp        = Random.Shared.Next(100_000, 1_000_000).ToString("D6");
            var sessionKey = Guid.NewGuid().ToString("N");

            _context.UserOtps.Add(new UserOtp
            {
                UserId     = user.UserId,
                OtpCode    = otp,
                SessionKey = sessionKey,
                ExpiresAt  = DateTime.UtcNow.AddMinutes(10),
                IsUsed     = false,
                CreatedAt  = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            // Fire-and-forget email — if SMTP fails we still want a meaningful error
            try
            {
                await _emailService.SendOtpEmailAsync(user.Email, user.Name, otp);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SMTP delivery failed for {Email}", user.Email);
                // Remove the OTP record so the user can retry cleanly
                var failed = await _context.UserOtps
                    .FirstOrDefaultAsync(o => o.SessionKey == sessionKey);
                if (failed != null) _context.UserOtps.Remove(failed);
                await _context.SaveChangesAsync();
                return StatusCode(502, new { message = "Could not send verification email. Check SMTP settings in appsettings.json." });
            }

            _logger.LogInformation("OTP challenge issued for {Email}", user.Email);

            return Ok(new OtpChallengeDto
            {
                RequiresOtp  = true,
                SessionKey   = sessionKey,
                MaskedEmail  = MaskEmail(user.Email)
            });
        }

        // ── Step 2 — Verify OTP → issue JWT ──────────────────────────────────
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

            if (record.OtpCode != dto.Otp)
                throw new UnauthorizedAccessException("Incorrect verification code. Please check your email and try again.");

            // Mark used before generating token
            record.IsUsed = true;
            await _context.SaveChangesAsync();

            var user = await _context.Users.FindAsync(record.UserId)
                ?? throw new UnauthorizedAccessException("User not found.");

            var token = _authRepository.GenerateJwtToken(user);

            _logger.LogInformation("User {Name} ({Email}) completed 2FA and logged in with role {Role}",
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

        // ── Resend OTP (uses same session, issues fresh code) ─────────────────
        [HttpPost("resend-otp")]
        public async Task<IActionResult> ResendOtp([FromBody] ResendOtpDto dto)
        {
            // Find the most recent OTP for this session (even if expired)
            var old = await _context.UserOtps
                .FirstOrDefaultAsync(o => o.SessionKey == dto.SessionKey);

            if (old == null)
                throw new UnauthorizedAccessException("Session not found. Please sign in again.");

            var user = await _context.Users.FindAsync(old.UserId)
                ?? throw new UnauthorizedAccessException("User not found.");

            // Remove old OTP
            _context.UserOtps.Remove(old);

            var otp        = Random.Shared.Next(100_000, 1_000_000).ToString("D6");
            var sessionKey = Guid.NewGuid().ToString("N");

            _context.UserOtps.Add(new UserOtp
            {
                UserId     = user.UserId,
                OtpCode    = otp,
                SessionKey = sessionKey,
                ExpiresAt  = DateTime.UtcNow.AddMinutes(10),
                IsUsed     = false,
                CreatedAt  = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            try
            {
                await _emailService.SendOtpEmailAsync(user.Email, user.Name, otp);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SMTP resend failed for {Email}", user.Email);
                return StatusCode(502, new { message = "Could not send verification email. Please check SMTP settings." });
            }

            _logger.LogInformation("OTP resent for {Email}", user.Email);

            return Ok(new { sessionKey, maskedEmail = MaskEmail(user.Email) });
        }

        // ── Ping ──────────────────────────────────────────────────────────────
        [HttpGet("ping")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public IActionResult Ping() => Ok(new { ok = true });

        // ── Helpers ───────────────────────────────────────────────────────────
        private static string MaskEmail(string email)
        {
            var at = email.IndexOf('@');
            if (at <= 1) return email;
            return email[0] + new string('*', Math.Max(0, at - 2)) + email[(at - 1)..];
        }
    }
}
