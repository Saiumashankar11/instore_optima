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
    /// <summary>
    /// API endpoints for managing users.
    /// </summary>
    public class UserController : ControllerBase
    {
        private readonly IUserRepository _userRepository;

        public UserController(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        /// <summary>
        /// Gets all users in the system (no passwords).
        /// </summary>
        /// <returns>A list of all users.</returns>
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
                Token = string.Empty,
                CreatedAt = u.CreatedAt
            });

            return Ok(result);
        }

        /// <summary>
        /// Gets a specific user by their ID.
        /// </summary>
        /// <param name="id">The ID of the user.</param>
        /// <returns>The user details if found; otherwise, NotFound.</returns>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetUserById(int id)
        {
            var user = await _userRepository.GetUserByIdAsync(id);

            if (user == null)
                throw new ResourceNotFoundException("User", id);

            return Ok(new AuthResponseDto
            {
                UserId = user.UserId,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role,
                Token = string.Empty,
                CreatedAt = user.CreatedAt
            });
        }

        /// <summary>
        /// Updates a user's name, email, or role.
        /// </summary>
        /// <param name="id">The ID of the user to update.</param>
        /// <param name="dto">The updated user data.</param>
        /// <returns>The updated user details if successful; otherwise, NotFound.</returns>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] RegisterDto dto)
        {
            var existing = await _userRepository.GetUserByIdAsync(id);

            if (existing == null)
                throw new ResourceNotFoundException("User", id);

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

        /// <summary>
        /// Deletes a user by their ID.
        /// </summary>
        /// <param name="id">The ID of the user to delete.</param>
        /// <returns>NoContent if successful; otherwise, NotFound.</returns>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var existing = await _userRepository.GetUserByIdAsync(id);

            if (existing == null)
                throw new ResourceNotFoundException("User", id);

            await _userRepository.DeleteUserAsync(id);

            return NoContent();
        }
    }
}