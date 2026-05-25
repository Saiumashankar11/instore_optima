using instore_optima.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Security.Claims;
using System.Text.Json;

namespace instore_optima.Infrastructure.Data
{
    /// <summary>
    /// EF Core interceptor that automatically writes an AuditLog row
    /// for every INSERT / UPDATE / DELETE across all tracked entities.
    /// It reads the current user ID from the JWT via IHttpContextAccessor.
    /// </summary>
    public class AuditInterceptor : SaveChangesInterceptor
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        // Entities that should never trigger an audit log (to avoid infinite loops)
        private static readonly HashSet<Type> _excluded = new()
        {
            typeof(AuditLog),
            typeof(StockMovement),   // already tracked explicitly
        };

        public AuditInterceptor(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public override InterceptionResult<int> SavingChanges(
            DbContextEventData eventData, InterceptionResult<int> result)
        {
            WriteAuditLogs(eventData.Context);
            return base.SavingChanges(eventData, result);
        }

        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData, InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            WriteAuditLogs(eventData.Context);
            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }

        private void WriteAuditLogs(DbContext? context)
        {
            if (context == null) return;

            // Resolve caller's user ID from JWT claims (0 = system/anonymous)
            int actorId = 0;
            var user = _httpContextAccessor.HttpContext?.User;
            if (user != null)
            {
                var sub = user.FindFirstValue("userId")
                       ?? user.FindFirstValue("sub")
                       ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
                if (int.TryParse(sub, out var parsed)) actorId = parsed;
            }

            // Skip audit logging when there is no authenticated user (e.g. during register/login)
            if (actorId == 0) return;

            var entries = context.ChangeTracker.Entries()
                .Where(e => !_excluded.Contains(e.Entity.GetType()) &&
                            (e.State == EntityState.Added ||
                             e.State == EntityState.Modified ||
                             e.State == EntityState.Deleted))
                .ToList();

            foreach (var entry in entries)
            {
                string entityType = entry.Entity.GetType().Name;
                string action     = entry.State.ToString(); // Added / Modified / Deleted

                // Try to get the primary key value
                int entityId = 0;
                var pkProp = entry.Properties.FirstOrDefault(p => p.Metadata.IsPrimaryKey());
                if (pkProp != null && pkProp.CurrentValue is int id) entityId = id;

                // Serialize old and new values
                string oldValues = "—";
                string newValues = "—";

                if (entry.State == EntityState.Modified)
                {
                    var old = entry.Properties
                        .Where(p => p.IsModified)
                        .ToDictionary(p => p.Metadata.Name, p => p.OriginalValue?.ToString() ?? "null");
                    var @new = entry.Properties
                        .Where(p => p.IsModified)
                        .ToDictionary(p => p.Metadata.Name, p => p.CurrentValue?.ToString() ?? "null");
                    oldValues = JsonSerializer.Serialize(old);
                    newValues = JsonSerializer.Serialize(@new);
                }
                else if (entry.State == EntityState.Added)
                {
                    var @new = entry.Properties
                        .ToDictionary(p => p.Metadata.Name, p => p.CurrentValue?.ToString() ?? "null");
                    newValues = JsonSerializer.Serialize(@new);
                }
                else if (entry.State == EntityState.Deleted)
                {
                    var old = entry.Properties
                        .ToDictionary(p => p.Metadata.Name, p => p.CurrentValue?.ToString() ?? "null");
                    oldValues = JsonSerializer.Serialize(old);
                }

                string description = $"{action} {entityType} (ID: {entityId})";

                context.Set<AuditLog>().Add(new AuditLog
                {
                    UserId      = actorId,
                    Action      = action,
                    EntityType  = entityType,
                    EntityId    = entityId,
                    Description = description,
                    OldValues   = oldValues,
                    NewValues   = newValues,
                    CreatedAt   = DateTime.UtcNow
                });
            }
        }
    }
}

