using instore_optima.Application.DTOs;
using instore_optima.Domain.Interfaces;
using instore_optima.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/user")]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly IUserRepository _userRepository;

        public UserController(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        // GET api/user — returns all users (no passwords)
        [HttpGet]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _userRepository.GetAllUsersAsync();

            var result = users.Select(u => new AuthResponseDto
            {
                UserId = u.UserId,
                Name = u.Name,
                Email = u.Email,
                Role = u.Role,
                Token = string.Empty   // no token needed for listing users
            });

            return Ok(result);
        }

        // GET api/user/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetUserById(int id)
        {
            var user = await _userRepository.GetUserByIdAsync(id);

            if (user == null)
                return NotFound(new { message = $"User with ID {id} not found." });

            return Ok(new AuthResponseDto
            {
                UserId = user.UserId,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role,
                Token = string.Empty
            });
        }

        // PUT api/user/{id} — update name, email, role
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] RegisterDto dto)
        {
            var existing = await _userRepository.GetUserByIdAsync(id);

            if (existing == null)
                return NotFound(new { message = $"User with ID {id} not found." });

            existing.Name = dto.Name;
            existing.Email = dto.Email;
            existing.Role = dto.Role;

            var updated = await _userRepository.UpdateUserAsync(existing);

            return Ok(new AuthResponseDto
            {
                UserId = updated.UserId,
                Name = updated.Name,
                Email = updated.Email,
                Role = updated.Role,
                Token = string.Empty
            });
        }

        // DELETE api/user/{id} — soft delete
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var existing = await _userRepository.GetUserByIdAsync(id);

            if (existing == null)
                return NotFound(new { message = $"User with ID {id} not found." });

            await _userRepository.DeleteUserAsync(id);

            return NoContent(); // 204 — success, no body
        }
    }
}