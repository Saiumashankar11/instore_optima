// AuditLogRepository — EF Core data access for the AuditLog entity via AppDbContext.
// Provides APPEND-ONLY access to the audit trail: read all logs, read per-user logs, and insert.
// No update or delete methods exist — the audit trail must remain immutable.
using instore_optima.Domain.Entities;
using instore_optima.Domain.Interfaces;
using instore_optima.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Infrastructure.Repositories
{
    public class AuditLogRepository : IAuditLogRepository
    {
        // Inject ApplicationDbContext — DO NOT modify it, Uma owns it
        private readonly AppDbContext _context;

        public AuditLogRepository(AppDbContext context)
        {
            _context = context;
        }

        // Get all audit logs — newest first
        public async Task<IEnumerable<AuditLog>> GetAllLogsAsync()
        {
            return await _context.AuditLogs
                .OrderByDescending(a => a.CreatedAt)  // most recent events appear first
                .ToListAsync();
        }

        // Get logs for a specific user — newest first
        public async Task<IEnumerable<AuditLog>> GetLogsByUserIdAsync(int userId)
        {
            return await _context.AuditLogs
                .Where(a => a.UserId == userId)            // filter to one user's actions
                .OrderByDescending(a => a.CreatedAt)       // newest first
                .ToListAsync();
        }

        // Create a new log entry — timestamp always set server-side
        public async Task<AuditLog> CreateLogAsync(AuditLog log)
        {
            log.CreatedAt = DateTime.UtcNow;  // always use server time so clocks can't be faked
            _context.AuditLogs.Add(log);
            await _context.SaveChangesAsync();
            return log;
        }
    }
}