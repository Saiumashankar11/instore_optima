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
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();
        }

        // Get logs for a specific user — newest first
        public async Task<IEnumerable<AuditLog>> GetLogsByUserIdAsync(int userId)
        {
            return await _context.AuditLogs
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();
        }

        // Create a new log entry — timestamp always set server-side
        public async Task<AuditLog> CreateLogAsync(AuditLog log)
        {
            log.CreatedAt = DateTime.UtcNow;
            _context.AuditLogs.Add(log);
            await _context.SaveChangesAsync();
            return log;
        }
    }
}