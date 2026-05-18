using instore_optima.Api.Exceptions;
using instore_optima.Application.DTOs;
using instore_optima.Domain.Entities;
using instore_optima.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/auditlog")]
    [Authorize]
    /// <summary>
    /// API endpoints for managing audit logs.
    /// </summary>
    public class AuditLogController : ControllerBase
    {
        private readonly IAuditLogRepository _auditLogRepository;
        private readonly IUserRepository _userRepository;

        public AuditLogController(
            IAuditLogRepository auditLogRepository,
            IUserRepository userRepository)
        {
            _auditLogRepository = auditLogRepository;
            _userRepository = userRepository;
        }

        /// <summary>
        /// Gets all audit logs. Admin only.
        /// </summary>
        /// <returns>A list of all audit logs in the system.</returns>
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllLogs()
        {
            var logs = await _auditLogRepository.GetAllLogsAsync();

            if (logs == null || !logs.Any())
                throw new ResourceNotFoundException("AuditLogs", "All");

            var result = logs.Select(l => new AuditLogResponseDto
            {
                AuditLogId = l.AuditLogId,
                UserId = l.UserId,
                Action = l.Action,
                EntityType = l.EntityType,
                EntityId = l.EntityId,
                Description = l.Description,
                OldValues = l.OldValues,
                NewValues = l.NewValues,
                CreatedAt = l.CreatedAt
            });

            return Ok(result);
        }

        /// <summary>
        /// Gets all audit logs for a specific user.
        /// </summary>
        /// <param name="userId">The ID of the user whose logs to retrieve.</param>
        /// <returns>A list of audit logs for the specified user.</returns>
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetLogsByUser(int userId)
        {
            var user = await _userRepository.GetUserByIdAsync(userId);
            if (user == null)
                return NotFound(new { message = $"User with ID {userId} not found." });

            var logs = await _auditLogRepository.GetLogsByUserIdAsync(userId);

            var result = logs.Select(l => new AuditLogResponseDto
            {
                AuditLogId = l.AuditLogId,
                UserId = l.UserId,
                UserName = user.Name,
                Action = l.Action,
                EntityType = l.EntityType,
                EntityId = l.EntityId,
                Description = l.Description,
                OldValues = l.OldValues,
                NewValues = l.NewValues,
                CreatedAt = l.CreatedAt
            });

            return Ok(result);
        }
    }
}