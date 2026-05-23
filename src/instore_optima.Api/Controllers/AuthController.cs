// instore_optima.Api/Controllers/AuthController.cs

using instore_optima.Application.DTOs;
using instore_optima.Domain.Entities;
using instore_optima.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;
using instore_optima.Api.Exceptions;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/auth")]
    /// <summary>
    /// API endpoints for authentication and user registration.
    /// </summary>
    public class AuthController : BaseApiController
    {
        private readonly IAuthRepository _authRepository;

        public AuthController(IAuthRepository authRepository)
        {
            _authRepository = authRepository;
        }

        /// <summary>
        /// Registers a new user in the system.
        /// </summary>
        /// <param name="dto">The registration data for the new user.</param>
        /// <returns>The created user details, or an error if registration fails.</returns>
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            ValidateModelState();

            // Check if email already exists
            var existingUser = await _authRepository.GetUserByEmailAsync(dto.Email);
            if (existingUser != null)
                throw new ValidationException(new Dictionary<string, string[]> { { "Email", new[] { "Email already registered" } } });

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

        /// <summary>
        /// Authenticates a user and returns a JWT token if successful.
        /// </summary>
        /// <param name="dto">The login credentials.</param>
        /// <returns>User details and JWT token if authentication is successful; otherwise, Unauthorized.</returns>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            ValidateModelState();

            // Check if user exists
            var user = await _authRepository.GetUserByEmailAsync(dto.Email);
            if (user == null)
                throw new UnauthorizedAccessException("Invalid email or password");

            // Check if account has been deactivated
            if (user.Role == "Inactive")
                throw new UnauthorizedAccessException("This account has been deactivated. Please contact an administrator.");

            // Verify password
            var isValid = _authRepository.VerifyPassword(dto.Password, user.Password);
            if (!isValid)
                throw new UnauthorizedAccessException("Invalid email or password");

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