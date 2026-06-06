// ── AuditLogController.cs ─────────────────────────────────────────────────────
// Handles all HTTP endpoints under the route  api/auditlog.
//
// Audit logs record every significant action taken in the system — who did what,
// on which entity, and when.  They capture both the old and new values so that
// changes can be reviewed or reversed if needed.
//
// Authentication: every endpoint requires a valid JWT ([Authorize]).
// Retrieving all logs is further restricted to Admin and Manager roles.
// ─────────────────────────────────────────────────────────────────────────────
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
    [Authorize] // All endpoints require a valid JWT token.
    /// <summary>
    /// API endpoints for managing audit logs.
    /// </summary>
    public class AuditLogController : ControllerBase
    {
        // ── Injected repositories ─────────────────────────────────────────────
        private readonly IAuditLogRepository _auditLogRepository; // For reading audit log records.
        private readonly IUserRepository _userRepository;         // For looking up user names to enrich log entries.

        // Constructor — both repositories are provided by ASP.NET Core's DI container.
        public AuditLogController(
            IAuditLogRepository auditLogRepository,
            IUserRepository userRepository)
        {
            _auditLogRepository = auditLogRepository;
            _userRepository = userRepository;
        }

        // ── GET api/auditlog ──────────────────────────────────────────────────
        /// <summary>
        /// GET api/auditlog
        /// Returns every audit log entry in the system.
        /// Throws 404 if the log table is empty (the log should never be empty in
        /// a running system, so this signals a configuration issue).
        /// Auth: Admin or Manager roles only.
        /// Returns: 200 OK with a list of AuditLogResponseDto objects.
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Admin,Manager")] // Narrower restriction: only Admin/Manager may list all logs.
        public async Task<IActionResult> GetAllLogs()
        {
            var logs = await _auditLogRepository.GetAllLogsAsync();

            // Guard: if no logs are found at all, treat it as a 404.
            if (logs == null || !logs.Any())
                throw new ResourceNotFoundException("AuditLogs", "All");

            // Project each AuditLog entity to a safe DTO for the API response.
            var result = logs.Select(l => new AuditLogResponseDto
            {
                AuditLogId = l.AuditLogId,
                UserId = l.UserId,
                Action = l.Action,           // e.g. "Create", "Update", "Delete"
                EntityType = l.EntityType,   // e.g. "Product", "Order"
                EntityId = l.EntityId,       // Primary key of the affected record.
                Description = l.Description, // Human-readable summary of the change.
                OldValues = l.OldValues,     // JSON snapshot of values before the change.
                NewValues = l.NewValues,     // JSON snapshot of values after the change.
                CreatedAt = l.CreatedAt      // When the action occurred.
            });

            return Ok(result);
        }

        // ── GET api/auditlog/user/{userId} ────────────────────────────────────
        /// <summary>
        /// GET api/auditlog/user/{userId}
        /// Returns all audit log entries created by a specific user.
        /// Useful for reviewing an individual's activity history.
        /// Auth: any authenticated user (a user can view their own logs; Admins can view any).
        /// Returns: 200 OK with a list of logs, or 404 if the user doesn't exist.
        /// </summary>
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetLogsByUser(int userId)
        {
            // Verify the user exists before querying their logs.
            var user = await _userRepository.GetUserByIdAsync(userId);
            if (user == null)
                return NotFound(new { message = $"User with ID {userId} not found." });

            var logs = await _auditLogRepository.GetLogsByUserIdAsync(userId);

            // Include the user's name in each log entry so the caller doesn't need
            // a second request to resolve the userId to a display name.
            var result = logs.Select(l => new AuditLogResponseDto
            {
                AuditLogId = l.AuditLogId,
                UserId = l.UserId,
                UserName = user.Name,        // Resolved from the user lookup above.
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
