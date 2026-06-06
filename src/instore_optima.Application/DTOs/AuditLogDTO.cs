// DTO — API response shapes for the Audit Log feature.
// AuditLogs are READ-ONLY from the API: administrators can only query them, never create or modify them.
namespace instore_optima.Application.DTOs
{
    // What goes OUT when returning audit log entries
    // AuditLogs are READ-ONLY — no CreateDto or UpdateDto needed
    public class AuditLogResponseDto
    {
        public int AuditLogId { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;   // joined from User — display name of who performed the action
        public string Action { get; set; } = string.Empty;     // Create | Update | Delete
        public string EntityType { get; set; } = string.Empty; // name of the affected table/class, e.g. "Order"
        public int EntityId { get; set; }                      // primary-key value of the affected record
        public string Description { get; set; } = string.Empty;
        public string OldValues { get; set; } = string.Empty;  // JSON string — record state BEFORE the change
        public string NewValues { get; set; } = string.Empty;  // JSON string — record state AFTER the change
        public DateTime CreatedAt { get; set; }
    }
}