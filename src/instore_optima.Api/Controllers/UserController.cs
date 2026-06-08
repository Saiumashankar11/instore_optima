// ── UserController.cs ─────────────────────────────────────────────────────────
// Handles all HTTP endpoints under the route  api/user.
//
// These endpoints manage user accounts within the system (list, read, update,
// delete).  User registration and login live in a separate AuthController.
//
// Authentication: the entire controller is restricted to Admin and Manager roles.
// Deleting a user is additionally locked to Admin only, and triggers a
// deactivation email to the removed user's address.
// ─────────────────────────────────────────────────────────────────────────────
using instore_optima.Application.DTOs;
using instore_optima.Domain.Interfaces;
using instore_optima.Domain.Entities;
using instore_optima.Api.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/user")]
    [Authorize(Roles = "Admin,Manager")] // Only Admin and Manager may access any endpoint here.
    public class UserController : ControllerBase
    {
        // ── Injected services ─────────────────────────────────────────────────
        private readonly IUserRepository _userRepository; // Handles user DB operations.
        private readonly IEmailService   _emailService;   // Sends transactional emails.
        private readonly ILogger<UserController> _logger; // Structured logging for error tracking.

        // Constructor — all three services are provided by ASP.NET Core's DI container.
        public UserController(IUserRepository userRepository, IEmailService emailService, ILogger<UserController> logger)
        {
            _userRepository = userRepository;
            _emailService   = emailService;
            _logger         = logger;
        }

        // ── GET api/user ──────────────────────────────────────────────────────
        /// <summary>
        /// Returns a list of all registered users (without sensitive data like
        /// password hashes). The Token field in the response is intentionally
        /// left empty — JWT tokens are issued only by the auth endpoints.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _userRepository.GetAllUsersAsync();

            // Project each User entity to a safe DTO (no password hash, empty token).
            var result = users.Select(u => new AuthResponseDto
            {
                UserId    = u.UserId,
                Name      = u.Name,
                Email     = u.Email,
                Role      = u.Role,
                Token     = string.Empty, // Never return a JWT in a list query.
                CreatedAt = u.CreatedAt
            });

            return Ok(result);
        }

        // ── GET api/user/{id} ─────────────────────────────────────────────────
        /// <summary>
        /// Returns the profile of a single user by their primary key.
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetUserById(int id)
        {
            var user = await _userRepository.GetUserByIdAsync(id);
            if (user == null) throw new ResourceNotFoundException("User", id); // Global handler → 404.

            return Ok(new AuthResponseDto
            {
                UserId = user.UserId,
                Name   = user.Name,
                Email  = user.Email,
                Role   = user.Role,
                Token  = string.Empty, // Token is never exposed outside auth flows.
                CreatedAt = user.CreatedAt
            });
        }

        // ── PUT api/user/{id} ─────────────────────────────────────────────────
        /// <summary>
        /// Updates the Name, Email, and Role of an existing user.
        /// Note: passwords are changed through a separate change-password endpoint.
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] RegisterDto dto)
        {
            var existing = await _userRepository.GetUserByIdAsync(id);
            if (existing == null) throw new ResourceNotFoundException("User", id);

            // Apply changes to the tracked entity.
            existing.Name  = dto.Name;
            existing.Email = dto.Email;
            existing.Role  = dto.Role;

            var updated = await _userRepository.UpdateUserAsync(existing);

            return Ok(new AuthResponseDto
            {
                UserId = updated.UserId,
                Name   = updated.Name,
                Email  = updated.Email,
                Role   = updated.Role,
                Token  = string.Empty // No token needed for an update response.
            });
        }

        // ── DELETE api/user/{id} ──────────────────────────────────────────────
        /// <summary>
        /// Permanently removes a user account and sends them a deactivation email.
        /// The email send is best-effort — if SMTP is unavailable, the delete still
        /// succeeds and the error is logged rather than surfaced to the caller.
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")] // Restrict deletions to Admin only (narrower than the controller-level restriction).
        public async Task<IActionResult> DeleteUser(int id)
        {
            var existing = await _userRepository.GetUserByIdAsync(id);
            if (existing == null) throw new ResourceNotFoundException("User", id);

            // Capture name and email before deletion so they can be used in the notification email.
            var name  = existing.Name;
            var email = existing.Email;

            await _userRepository.DeleteUserAsync(id);

            // Fire deactivation email — don't fail the request if SMTP is down
            try
            {
                await _emailService.SendAccountDeactivatedEmailAsync(email, name);
            }
            catch (Exception ex)
            {
                // Log the SMTP failure for ops visibility but don't propagate it —
                // the user record has already been removed successfully.
                _logger.LogError(ex, "Could not send deactivation email to {Email}", email);
            }

            return NoContent(); // 204 — successful delete, no response body.
        }
    }
}
