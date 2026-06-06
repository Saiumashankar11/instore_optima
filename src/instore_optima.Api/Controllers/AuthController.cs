// ── AuthController ────────────────────────────────────────────────────────────
// Handles all authentication and user-account endpoints under /api/auth.
// Covers: registration, two-factor login (email OTP or TOTP authenticator app),
// password management, user profile, and TOTP setup/enable/disable.
// ─────────────────────────────────────────────────────────────────────────────

// Standard ASP.NET Core and domain/infrastructure namespaces
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
        // ── Injected services ─────────────────────────────────────────────────
        // _authRepository  — handles user lookup, password hashing, JWT generation, and audit logging
        // _emailService    — sends OTP and password-reset emails via SMTP
        // _context         — direct EF Core access for OTP records and user queries
        // _logger          — structured logging for security-sensitive events
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
        // POST /api/auth/register
        // Creates a new user account. Open (no auth required).
        // Returns 201 with basic profile; token is empty because the user must
        // complete the login flow (2FA) to get a real JWT.
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            ValidateModelState(); // throws ValidationException if model annotations fail

            // Prevent duplicate registrations for the same email address
            var existingUser = await _authRepository.GetUserByEmailAsync(dto.Email);
            if (existingUser != null)
                throw new ValidationException(new Dictionary<string, string[]>
                    { { "Email", new[] { "Email already registered" } } });

            // Build the new User entity; password is hashed before storage
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

            // Write an audit record so admins can see who registered and when
            await _authRepository.LogAuditAsync(created.UserId, "Register", "User", created.UserId);

            return StatusCode(201, new AuthResponseDto
            {
                UserId = created.UserId,
                Name   = created.Name,
                Email  = created.Email,
                Role   = created.Role,
                Token  = string.Empty // No JWT yet — user must complete 2FA login
            });
        }

        // ── Step 1 — Validate credentials → send OTP or TOTP challenge ────────
        // POST /api/auth/login
        // First leg of the two-factor login flow. Checks email + password,
        // then either issues a TOTP challenge (no email sent — app generates the code)
        // or sends a 6-digit OTP to the user's email address.
        // Returns a sessionKey that the client must pass to /verify-otp.
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            ValidateModelState();

            // Look up the user; intentionally use the same error message for unknown
            // email and wrong password to avoid disclosing which accounts exist.
            var user = await _authRepository.GetUserByEmailAsync(dto.Email);
            if (user == null)
            {
                _logger.LogWarning("Failed login — unknown email {Email}", dto.Email);
                throw new UnauthorizedAccessException("Invalid email or password.");
            }

            // Deactivated accounts are blocked from logging in
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

            // A fresh sessionKey ties this OTP to the pending login session
            var sessionKey = Guid.NewGuid().ToString("N");

            if (user.TotpEnabled && !string.IsNullOrEmpty(user.TotpSecret))
            {
                // TOTP challenge — no email sent; app generates the code
                // Store a placeholder OTP record (Purpose = "totp") so verify-otp can look it up
                _context.UserOtps.Add(new UserOtp
                {
                    UserId     = user.UserId,
                    OtpCode    = string.Empty, // TOTP codes are time-based; validated against the secret
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
                    MaskedEmail     = MaskEmail(user.Email) // e.g. j***n@example.com
                });
            }

            // Email OTP challenge — generate a random 6-digit code
            var otp = Random.Shared.Next(100_000, 1_000_000).ToString("D6");

            _context.UserOtps.Add(new UserOtp
            {
                UserId     = user.UserId,
                OtpCode    = otp,
                SessionKey = sessionKey,
                ExpiresAt  = DateTime.UtcNow.AddMinutes(3), // codes expire after 3 minutes
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
                // If the email fails, roll back the OTP record so the user isn't locked waiting
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
        // POST /api/auth/switch-to-email-otp
        // Lets a user who was issued a TOTP challenge switch to receiving a code by email instead
        // (e.g. they lost access to their authenticator app). Invalidates the TOTP session
        // and creates a new email OTP session. Open — no JWT needed.
        [HttpPost("switch-to-email-otp")]
        public async Task<IActionResult> SwitchToEmailOtp([FromBody] ResendOtpDto dto)
        {
            // Find the pending TOTP challenge using the sessionKey from the login step
            var record = await _context.UserOtps
                .FirstOrDefaultAsync(o => o.SessionKey == dto.SessionKey && o.Purpose == "totp" && !o.IsUsed);

            if (record == null)
                throw new UnauthorizedAccessException("Session not found or already used. Please sign in again.");

            var user = await _context.Users.FindAsync(record.UserId)
                ?? throw new UnauthorizedAccessException("User not found.");

            // Replace TOTP session with an email OTP session
            _context.UserOtps.Remove(record);

            var otp        = Random.Shared.Next(100_000, 1_000_000).ToString("D6");
            var sessionKey = Guid.NewGuid().ToString("N"); // new key so old sessionKey is invalidated

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
        // POST /api/auth/verify-otp
        // Completes the two-factor login. Validates the code the user submitted against
        // the stored OTP record (or the live TOTP calculation). On success, marks the
        // record as used and returns a signed JWT the client stores for future requests.
        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpDto dto)
        {
            ValidateModelState();

            // Find the matching, non-expired, not-yet-used OTP session
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
                // VerificationWindow(2,2) allows ±2 time-steps (~1 min clock drift tolerance)
                if (string.IsNullOrEmpty(user.TotpSecret))
                    throw new UnauthorizedAccessException("Authenticator not configured. Please sign in again.");

                var totp = new Totp(Base32Encoding.ToBytes(user.TotpSecret));
                bool totpValid = totp.VerifyTotp(dto.Otp, out _, new VerificationWindow(2, 2));

                if (!totpValid)
                    throw new UnauthorizedAccessException("Incorrect verification code. Please check your authenticator app.");
            }
            else
            {
                // Validate email OTP code — simple string equality check
                if (record.OtpCode != dto.Otp)
                    throw new UnauthorizedAccessException("Incorrect verification code. Please check your email and try again.");
            }

            // Mark the OTP as consumed so it cannot be reused
            record.IsUsed = true;
            await _context.SaveChangesAsync();

            // Generate a signed JWT containing the user's id, name, email, and role
            var token = _authRepository.GenerateJwtToken(user);

            _logger.LogInformation("User {Name} ({Email}) completed 2FA login with role {Role}",
                user.Name, user.Email, user.Role);

            // Write an audit record for the completed login
            await _authRepository.LogAuditAsync(user.UserId, "Login", "User", user.UserId);

            return Ok(new AuthResponseDto
            {
                UserId = user.UserId,
                Name   = user.Name,
                Email  = user.Email,
                Role   = user.Role,
                Token  = token // client stores this and sends it in the Authorization header
            });
        }

        // ── Resend OTP (preserves purpose) ────────────────────────────────────
        // POST /api/auth/resend-otp
        // Lets a user request a fresh OTP if the previous one expired or was lost.
        // Keeps the same purpose (login or reset) and issues a new sessionKey.
        // TOTP codes cannot be resent because they are generated by the authenticator app.
        [HttpPost("resend-otp")]
        public async Task<IActionResult> ResendOtp([FromBody] ResendOtpDto dto)
        {
            // Find the existing session; it can be expired — user just wants a new code
            var old = await _context.UserOtps
                .FirstOrDefaultAsync(o => o.SessionKey == dto.SessionKey);

            if (old == null)
                throw new UnauthorizedAccessException("Session not found. Please sign in again.");

            // TOTP codes are time-based; the app generates them, so we cannot resend one
            if (old.Purpose == "totp")
                return BadRequest(new { message = "TOTP codes are generated by your authenticator app." });

            var user = await _context.Users.FindAsync(old.UserId)
                ?? throw new UnauthorizedAccessException("User not found.");

            // Preserve the original purpose (login vs. reset) for the replacement record
            var oldPurpose = old.Purpose;
            _context.UserOtps.Remove(old); // invalidate the old record

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
                Purpose    = oldPurpose // carry forward "login" or "reset"
            });
            await _context.SaveChangesAsync();

            try
            {
                // Choose the appropriate email template based on the session purpose
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
        // POST /api/auth/forgot-password
        // Initiates the password-reset flow. Sends a 6-digit reset OTP to the user's
        // registered email address. Open — no JWT required.
        // IMPORTANT: always returns a generic success message regardless of whether the
        // email exists, to prevent attackers from enumerating registered accounts.
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            ValidateModelState();

            // Always return success to prevent user enumeration
            var user = await _authRepository.GetUserByEmailAsync(dto.Email);
            if (user == null || user.Role == "Inactive")
            {
                // Log for admin visibility but return the same 200 response as the happy path
                _logger.LogInformation("Forgot-password requested for unknown/inactive email {Email}", dto.Email);
                return Ok(new { message = "If that email exists, a reset code has been sent." });
            }

            // Remove any existing reset OTPs for this user so old codes cannot be used
            var staleResets = _context.UserOtps.Where(o => o.UserId == user.UserId && o.Purpose == "reset");
            _context.UserOtps.RemoveRange(staleResets);

            var otp        = Random.Shared.Next(100_000, 1_000_000).ToString("D6");
            var sessionKey = Guid.NewGuid().ToString("N");

            _context.UserOtps.Add(new UserOtp
            {
                UserId     = user.UserId,
                OtpCode    = otp,
                SessionKey = sessionKey,
                ExpiresAt  = DateTime.UtcNow.AddMinutes(3), // reset codes expire in 3 minutes
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

            // Return the sessionKey so the client can pair it with the OTP in the next step
            return Ok(new { sessionKey, maskedEmail = MaskEmail(user.Email) });
        }

        // ── Reset Password ────────────────────────────────────────────────────
        // POST /api/auth/reset-password
        // Completes the password-reset flow. Validates the reset OTP from the email,
        // then replaces the stored hashed password with a new one. Open — no JWT required.
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            ValidateModelState();

            // Find a valid, unexpired, unused reset OTP that matches the session
            var record = await _context.UserOtps
                .FirstOrDefaultAsync(o =>
                    o.SessionKey == dto.SessionKey &&
                    o.Purpose    == "reset" &&
                    !o.IsUsed &&
                    o.ExpiresAt > DateTime.UtcNow);

            if (record == null)
                throw new UnauthorizedAccessException("Reset code has expired or is invalid. Please start over.");

            // Double-check the submitted OTP code matches what was stored
            if (record.OtpCode != dto.Otp)
                throw new UnauthorizedAccessException("Incorrect reset code.");

            var user = await _context.Users.FindAsync(record.UserId)
                ?? throw new UnauthorizedAccessException("User not found.");

            // Mark OTP as used and store the newly hashed password
            record.IsUsed  = true;
            user.Password  = _authRepository.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Password reset completed for {Email}", user.Email);

            return Ok(new { message = "Password updated successfully. You can now sign in." });
        }

        // ── Get Profile ───────────────────────────────────────────────────────
        // GET /api/auth/profile
        // Returns the authenticated user's profile details.
        // Requires: valid JWT (any role).
        [HttpGet("profile")]
        [Authorize]
        public async Task<IActionResult> GetProfile()
        {
            var userId = GetCurrentUserId(); // extracted from JWT claim
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
        // PUT /api/auth/profile
        // Updates the authenticated user's display name, phone number, and address.
        // Email and role cannot be changed here. Requires: valid JWT (any role).
        [HttpPut("profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            ValidateModelState();

            var userId = GetCurrentUserId();
            var user   = await _context.Users.FindAsync(userId)
                ?? throw new UnauthorizedAccessException("User not found.");

            // Trim whitespace; store null for optional fields left blank
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
        // POST /api/auth/change-password
        // Lets a logged-in user change their own password by supplying their
        // current password for confirmation. Requires: valid JWT (any role).
        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            ValidateModelState();

            var userId = GetCurrentUserId();
            var user   = await _context.Users.FindAsync(userId)
                ?? throw new UnauthorizedAccessException("User not found.");

            // Verify the user knows their current password before accepting the new one
            if (!_authRepository.VerifyPassword(dto.CurrentPassword, user.Password))
                throw new ValidationException(new Dictionary<string, string[]>
                    { { "CurrentPassword", new[] { "Current password is incorrect." } } });

            user.Password = _authRepository.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Password changed for {Email}", user.Email);
            return Ok(new { message = "Password updated successfully." });
        }

        // ── TOTP Setup — returns secret + QR URI without saving ───────────────
        // GET /api/auth/totp/setup
        // Generates a fresh TOTP secret and returns it as a Base32 string, a scannable
        // QR code URI (otpauth://), and a space-grouped manual entry key. The secret is
        // NOT stored yet — the user must scan it and confirm with /totp/enable.
        // Requires: valid JWT (any role).
        [HttpGet("totp/setup")]
        [Authorize]
        public async Task<IActionResult> TotpSetup()
        {
            var userId = GetCurrentUserId();
            var user   = await _context.Users.FindAsync(userId)
                ?? throw new UnauthorizedAccessException("User not found.");

            // Generate a cryptographically random 20-byte key and encode it as Base32
            var secretBytes  = KeyGeneration.GenerateRandomKey(20);
            var base32Secret = Base32Encoding.ToString(secretBytes);
            var encodedEmail = Uri.EscapeDataString(user.Email);
            // The otpauth URI is scanned by Google Authenticator, Authy, etc.
            var qrCodeUri    = $"otpauth://totp/InStore%20Optima:{encodedEmail}?secret={base32Secret}&issuer=InStore%20Optima&digits=6&period=30";

            return Ok(new TotpSetupResponseDto
            {
                Secret    = base32Secret,
                QrCodeUri = qrCodeUri,
                ManualKey = FormatManualKey(base32Secret) // grouped for readability, e.g. "ABCD EFGH ..."
            });
        }

        // ── TOTP Enable — verify code and save secret ─────────────────────────
        // POST /api/auth/totp/enable
        // Confirms the user has successfully scanned the QR code by asking them to
        // submit a valid TOTP code. Only then is the secret persisted and TOTP activated.
        // Requires: valid JWT (any role).
        [HttpPost("totp/enable")]
        [Authorize]
        public async Task<IActionResult> TotpEnable([FromBody] TotpEnableDto dto)
        {
            ValidateModelState();

            var userId = GetCurrentUserId();
            var user   = await _context.Users.FindAsync(userId)
                ?? throw new UnauthorizedAccessException("User not found.");

            // Decode the Base32 secret; reject malformed secrets early
            byte[] keyBytes;
            try { keyBytes = Base32Encoding.ToBytes(dto.Secret); }
            catch { return BadRequest(new { message = "Invalid secret key." }); }

            // Verify the submitted TOTP code against the secret with a ±2-step clock window
            var totp  = new Totp(keyBytes);
            bool valid = totp.VerifyTotp(dto.Code, out _, new VerificationWindow(2, 2));

            if (!valid)
                throw new ValidationException(new Dictionary<string, string[]>
                    { { "Code", new[] { "Code did not match. Make sure your authenticator app is scanning the right QR code." } } });

            // Code verified — persist the secret and flip the TOTP flag on
            user.TotpSecret  = dto.Secret;
            user.TotpEnabled = true;
            await _context.SaveChangesAsync();

            _logger.LogInformation("TOTP enabled for {Email}", user.Email);
            return Ok(new { message = "Authenticator app enabled successfully." });
        }

        // ── TOTP Disable — verify password first ──────────────────────────────
        // POST /api/auth/totp/disable
        // Turns off TOTP for the authenticated user after they confirm their password.
        // Clears the stored secret so the authenticator app entries become invalid.
        // Requires: valid JWT (any role).
        [HttpPost("totp/disable")]
        [Authorize]
        public async Task<IActionResult> TotpDisable([FromBody] TotpDisableDto dto)
        {
            ValidateModelState();

            var userId = GetCurrentUserId();
            var user   = await _context.Users.FindAsync(userId)
                ?? throw new UnauthorizedAccessException("User not found.");

            // Require password confirmation to prevent accidental or unauthorised disabling
            if (!_authRepository.VerifyPassword(dto.Password, user.Password))
                throw new ValidationException(new Dictionary<string, string[]>
                    { { "Password", new[] { "Incorrect password." } } });

            // Clear the secret and disable TOTP so the next login will use email OTP
            user.TotpSecret  = null;
            user.TotpEnabled = false;
            await _context.SaveChangesAsync();

            _logger.LogInformation("TOTP disabled for {Email}", user.Email);
            return Ok(new { message = "Authenticator app disabled." });
        }

        // ── Ping ──────────────────────────────────────────────────────────────
        // GET /api/auth/ping
        // Lightweight liveness check. Returns { ok: true } if the JWT is valid.
        // Useful for the frontend to confirm a stored token is still accepted.
        [HttpGet("ping")]
        [Authorize]
        public IActionResult Ping() => Ok(new { ok = true });

        // ── Helpers ───────────────────────────────────────────────────────────
        // MaskEmail: hides the middle characters of an email for display, e.g. j***n@example.com
        private static string MaskEmail(string email)
        {
            var at = email.IndexOf('@');
            if (at <= 1) return email;
            return email[0] + new string('*', Math.Max(0, at - 2)) + email[(at - 1)..];
        }

        // FormatManualKey: splits a Base32 secret into space-separated 4-character groups
        // so users can type it into an authenticator app more easily, e.g. "ABCD EFGH IJKL"
        private static string FormatManualKey(string base32)
        {
            // Format as XXXX XXXX XXXX ... groups of 4
            return string.Join(" ", Enumerable.Range(0, (base32.Length + 3) / 4)
                .Select(i => base32.Substring(i * 4, Math.Min(4, base32.Length - i * 4))));
        }

        // GetCurrentUserId: reads the "userId" claim from the JWT carried in the request
        private int GetCurrentUserId()
        {
            var idStr = User.FindFirstValue("userId");
            if (!int.TryParse(idStr, out int userId))
                throw new UnauthorizedAccessException("Invalid session.");
            return userId;
        }
    }
}
