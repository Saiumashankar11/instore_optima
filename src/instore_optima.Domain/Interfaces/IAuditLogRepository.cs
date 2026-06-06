// IAuditLogRepository — contract for reading and writing audit log entries.
// Audit logs record "who did what and when" across the system (logins, CRUD actions, etc.).
// They are APPEND-ONLY: no update or delete methods exist so the audit trail cannot be altered.
using instore_optima.Domain.Entities;

namespace instore_optima.Domain.Interfaces
{
    // AuditLogs are APPEND-ONLY — no Update or Delete methods
    public interface IAuditLogRepository
    {
        /// <summary>Returns every audit log entry in the system, ordered newest first.</summary>
        Task<IEnumerable<AuditLog>> GetAllLogsAsync();

        /// <summary>Returns all audit log entries for a specific user, ordered newest first.</summary>
        Task<IEnumerable<AuditLog>> GetLogsByUserIdAsync(int userId);

        /// <summary>Persists a new audit log entry. The timestamp is always set server-side.</summary>
        Task<AuditLog> CreateLogAsync(AuditLog log);
    }
}