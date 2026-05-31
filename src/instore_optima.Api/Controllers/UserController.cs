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
    [Authorize(Roles = "Admin,Manager")]
    public class UserController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly IEmailService   _emailService;
        private readonly ILogger<UserController> _logger;

        public UserController(IUserRepository userRepository, IEmailService emailService, ILogger<UserController> logger)
        {
            _userRepository = userRepository;
            _emailService   = emailService;
            _logger         = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _userRepository.GetAllUsersAsync();

            var result = users.Select(u => new AuthResponseDto
            {
                UserId    = u.UserId,
                Name      = u.Name,
                Email     = u.Email,
                Role      = u.Role,
                Token     = string.Empty,
                CreatedAt = u.CreatedAt
            });

            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetUserById(int id)
        {
            var user = await _userRepository.GetUserByIdAsync(id);
            if (user == null) throw new ResourceNotFoundException("User", id);

            return Ok(new AuthResponseDto
            {
                UserId = user.UserId,
                Name   = user.Name,
                Email  = user.Email,
                Role   = user.Role,
                Token  = string.Empty,
                CreatedAt = user.CreatedAt
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] RegisterDto dto)
        {
            var existing = await _userRepository.GetUserByIdAsync(id);
            if (existing == null) throw new ResourceNotFoundException("User", id);

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
                Token  = string.Empty
            });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var existing = await _userRepository.GetUserByIdAsync(id);
            if (existing == null) throw new ResourceNotFoundException("User", id);

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
                _logger.LogError(ex, "Could not send deactivation email to {Email}", email);
            }

            return NoContent();
        }
    }
}
