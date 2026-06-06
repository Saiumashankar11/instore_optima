// ReplenishmentRepository — EF Core data access for ReplenishmentRule and ReplenishmentOrder entities.
// Rules define per-product thresholds (MinLevel, MaxLevel, ReorderPoint) that drive auto-ordering.
// Orders are raised when stock falls to or below the ReorderPoint, either manually or automatically.
// TriggerAutoReplenishmentAsync uses raw SQL to insert orders so that the nullable ApprovedBy column
// is never set (EF would attempt to set it to null which can violate some migration constraints).
using instore_optima.Infrastructure.Data;
using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Infrastructure.Repositories
{
    public class ReplenishmentRepository : IReplenishmentRepository
    {
        private readonly AppDbContext _context;

        public ReplenishmentRepository(AppDbContext context)
        {
            _context = context;
        }

        // ── Rules ────────────────────────────────────────────────────

        // Returns all replenishment rules (one rule can exist per product)
        public async Task<IEnumerable<ReplenishmentRule>> GetAllRulesAsync()
            => await _context.ReplenishmentRules
                .ToListAsync();

        public async Task<ReplenishmentRule?> GetRuleByIdAsync(int ruleId)
            => await _context.ReplenishmentRules
                .FirstOrDefaultAsync(r => r.RuleId == ruleId);

        // Look up the rule for a product — used before auto-triggering a replenishment order
        public async Task<ReplenishmentRule?> GetRuleByProductIdAsync(int productId)
            => await _context.ReplenishmentRules
                .FirstOrDefaultAsync(r => r.ProductId == productId);

        public async Task<ReplenishmentRule> CreateRuleAsync(ReplenishmentRule rule)
        {
            rule.CreatedAt = DateTime.UtcNow;
            rule.Status = "Active";  // new rules are immediately active
            _context.ReplenishmentRules.Add(rule);
            await _context.SaveChangesAsync();
            return rule;
        }

        public async Task<ReplenishmentRule?> UpdateRuleAsync(int ruleId, ReplenishmentRule updated)
        {
            var rule = await _context.ReplenishmentRules
                .FirstOrDefaultAsync(r => r.RuleId == ruleId);
            if (rule == null) return null;

            // Explicitly map only the editable threshold fields
            rule.MinLevel = updated.MinLevel;
            rule.MaxLevel = updated.MaxLevel;
            rule.ReorderPoint = updated.ReorderPoint;  // stock level at which a new order is triggered
            rule.Status = updated.Status;

            await _context.SaveChangesAsync();
            return rule;
        }

        public async Task<bool> DeleteRuleAsync(int ruleId)
        {
            var rule = await _context.ReplenishmentRules
                .FirstOrDefaultAsync(r => r.RuleId == ruleId);
            if (rule == null) return false;

            _context.ReplenishmentRules.Remove(rule);
            await _context.SaveChangesAsync();
            return true;
        }

        // ── Replenishment Orders ──────────────────────────────────────

        // Returns all replenishment orders, newest first
        public async Task<IEnumerable<ReplenishmentOrder>> GetAllOrdersAsync()
            => await _context.ReplenishmentOrders
                .OrderByDescending(o => o.GeneratedAt)
                .ToListAsync();

        public async Task<ReplenishmentOrder?> GetOrderByIdAsync(int replenishmentOrderId)
            => await _context.ReplenishmentOrders
                .FirstOrDefaultAsync(o => o.ReplenishmentOrderId == replenishmentOrderId);

        public async Task<ReplenishmentOrder> CreateOrderAsync(ReplenishmentOrder order)
        {
            order.GeneratedAt = DateTime.UtcNow;
            order.Status = "Pending";  // always starts as Pending; must be approved before a PO is raised
            _context.ReplenishmentOrders.Add(order);
            await _context.SaveChangesAsync();
            return order;
        }

        // Overload used when an approver reviews and approves/rejects the order
        public async Task<ReplenishmentOrder?> UpdateOrderStatusAsync(
            int replenishmentOrderId, string status, int approvedBy)
        {
            var order = await _context.ReplenishmentOrders
                .FirstOrDefaultAsync(o => o.ReplenishmentOrderId == replenishmentOrderId);
            if (order == null) return null;

            order.Status = status;
            order.ApprovedBy = approvedBy;   // record which user approved/rejected the order
            order.ApprovedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return order;
        }

        // Overload used for status-only updates (e.g. system-initiated transitions with notes)
        public async Task<ReplenishmentOrder?> UpdateOrderStatusAsync(
            int replenishmentOrderId, string status, string notes)
        {
            var order = await _context.ReplenishmentOrders
                .FirstOrDefaultAsync(o => o.ReplenishmentOrderId == replenishmentOrderId);
            if (order == null) return null;

            order.Status = status;
            // notes parameter ignored — no Notes property on ReplenishmentOrder entity

            await _context.SaveChangesAsync();
            return order;
        }

        public async Task<bool> DeleteOrderAsync(int replenishmentOrderId)
        {
            var order = await _context.ReplenishmentOrders.FindAsync(replenishmentOrderId);
            if (order == null) return false;

            // Block deletion if a PO has already been created for this replenishment order
            bool hasPurchaseOrders = await _context.PurchaseOrders.AnyAsync(po => po.ReplenishmentOrderId == replenishmentOrderId);
            if (hasPurchaseOrders)
                throw new InvalidOperationException(
                    $"Replenishment order #{replenishmentOrderId} cannot be deleted because it has a linked purchase order.");

            _context.ReplenishmentOrders.Remove(order);
            await _context.SaveChangesAsync();
            return true;
        }

        // ── Auto Trigger ──────────────────────────────────────────────

        public async Task TriggerAutoReplenishmentAsync()
        {
            // Load all rules that are currently active (not paused or deleted)
            var activeRules = await _context.ReplenishmentRules
                .Where(r => r.Status == "Active")
                .ToListAsync();

            foreach (var rule in activeRules)
            {
                var stock = await _context.Stocks
                    .FirstOrDefaultAsync(s => s.ProductId == rule.ProductId);

                // Skip if no stock record exists or if stock is still above the reorder threshold
                if (stock == null || stock.CurrentStock > rule.ReorderPoint) continue;

                // Skip if a Pending order already exists (avoid duplicate orders)
                bool alreadyPending = await _context.ReplenishmentOrders
                    .AnyAsync(o => o.ProductId == rule.ProductId && o.Status == "Pending");

                if (alreadyPending) continue;

                // Use raw SQL to insert without touching ApprovedBy column at all
                // (EF would set it to null which can trigger a constraint violation in some migrations)
                await _context.Database.ExecuteSqlRawAsync(
                    @"INSERT INTO ReplenishmentOrders
                (ProductId, QuantityRequested, GeneratedAt, Status)
              VALUES
                ({0}, {1}, {2}, {3})",
                    rule.ProductId,
                    rule.MaxLevel - stock.CurrentStock,  // order enough to reach the MaxLevel target
                    DateTime.UtcNow,
                    "Pending"
                );
            }
        }
    }
}