// instore_optima.Api/Controllers/AuthController.cs

using instore_optima.Application.DTOs;
using instore_optima.Domain.Entities;
using instore_optima.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthRepository _authRepository;

        public AuthController(IAuthRepository authRepository)
        {
            _authRepository = authRepository;
        }

        // ─── Register ─────────────────────────────────────────
        // POST api/auth/register
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            // Check if email already exists
            var existingUser = await _authRepository.GetUserByEmailAsync(dto.Email);
            if (existingUser != null)
                return BadRequest(new { message = "Email already registered" });

            // Hash password and create user
            var user = new User
            {
                Name = dto.Name,
                Email = dto.Email,
                Password = _authRepository.HashPassword(dto.Password),
                Role = dto.Role,
                CreatedAt = DateTime.UtcNow
            };

            var created = await _authRepository.RegisterAsync(user);

            // Log audit
            await _authRepository.LogAuditAsync(
                created.UserId, "Register", "User", created.UserId);

            return StatusCode(201, new AuthResponseDto
            {
                UserId = created.UserId,
                Name = created.Name,
                Email = created.Email,
                Role = created.Role,
                Token = string.Empty   // No token on register — login to get token
            });
        }

        // ─── Login ────────────────────────────────────────────
        // POST api/auth/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            // Check if user exists
            var user = await _authRepository.GetUserByEmailAsync(dto.Email);
            if (user == null)
                return Unauthorized(new { message = "Invalid email or password" });

            // Verify password
            var isValid = _authRepository.VerifyPassword(dto.Password, user.Password);
            if (!isValid)
                return Unauthorized(new { message = "Invalid email or password" });

            // Generate JWT token
            var token = _authRepository.GenerateJwtToken(user);

            // Log audit
            await _authRepository.LogAuditAsync(
                user.UserId, "Login", "User", user.UserId);

            return Ok(new AuthResponseDto
            {
                UserId = user.UserId,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role,
                Token = token
            });
        }
    }
}