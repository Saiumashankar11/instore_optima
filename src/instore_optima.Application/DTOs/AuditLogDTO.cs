namespace instore_optima.Application.DTOs
{
    // What goes OUT when returning audit log entries
    // AuditLogs are READ-ONLY — no CreateDto or UpdateDto needed
    public class AuditLogResponseDto
    {
        public int AuditLogId { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;   // joined from User
        public string Action { get; set; } = string.Empty;     // Create | Update | Delete
        public string EntityType { get; set; } = string.Empty;
        public int EntityId { get; set; }
        public string Description { get; set; } = string.Empty;
        public string OldValues { get; set; } = string.Empty;  // JSON string
        public string NewValues { get; set; } = string.Empty;  // JSON string
        public DateTime CreatedAt { get; set; }
    }
}