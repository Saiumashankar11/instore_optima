using instore_optima.Domain.Entities;

namespace instore_optima.Domain.Interfaces
{
    // AuditLogs are APPEND-ONLY — no Update or Delete methods
    public interface IAuditLogRepository
    {
        Task<IEnumerable<AuditLog>> GetAllLogsAsync();
        Task<IEnumerable<AuditLog>> GetLogsByUserIdAsync(int userId);
        Task<AuditLog> CreateLogAsync(AuditLog log);
    }
}