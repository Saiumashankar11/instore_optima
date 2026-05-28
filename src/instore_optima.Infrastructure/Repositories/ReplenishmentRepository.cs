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

        public async Task<IEnumerable<ReplenishmentRule>> GetAllRulesAsync()
            => await _context.ReplenishmentRules
                .ToListAsync();

        public async Task<ReplenishmentRule?> GetRuleByIdAsync(int ruleId)
            => await _context.ReplenishmentRules
                .FirstOrDefaultAsync(r => r.RuleId == ruleId);

        public async Task<ReplenishmentRule?> GetRuleByProductIdAsync(int productId)
            => await _context.ReplenishmentRules
                .FirstOrDefaultAsync(r => r.ProductId == productId);

        public async Task<ReplenishmentRule> CreateRuleAsync(ReplenishmentRule rule)
        {
            rule.CreatedAt = DateTime.UtcNow;
            rule.Status = "Active";
            _context.ReplenishmentRules.Add(rule);
            await _context.SaveChangesAsync();
            return rule;
        }

        public async Task<ReplenishmentRule?> UpdateRuleAsync(int ruleId, ReplenishmentRule updated)
        {
            var rule = await _context.ReplenishmentRules
                .FirstOrDefaultAsync(r => r.RuleId == ruleId);
            if (rule == null) return null;

            rule.MinLevel = updated.MinLevel;
            rule.MaxLevel = updated.MaxLevel;
            rule.ReorderPoint = updated.ReorderPoint;
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
            order.Status = "Pending";
            _context.ReplenishmentOrders.Add(order);
            await _context.SaveChangesAsync();
            return order;
        }

        public async Task<ReplenishmentOrder?> UpdateOrderStatusAsync(
            int replenishmentOrderId, string status, int approvedBy)
        {
            var order = await _context.ReplenishmentOrders
                .FirstOrDefaultAsync(o => o.ReplenishmentOrderId == replenishmentOrderId);
            if (order == null) return null;

            order.Status = status;
            order.ApprovedBy = approvedBy;
            order.ApprovedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return order;
        }

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
            var activeRules = await _context.ReplenishmentRules
                .Where(r => r.Status == "Active")
                .ToListAsync();

            foreach (var rule in activeRules)
            {
                var stock = await _context.Stocks
                    .FirstOrDefaultAsync(s => s.ProductId == rule.ProductId);

                if (stock == null || stock.CurrentStock > rule.ReorderPoint) continue;

                bool alreadyPending = await _context.ReplenishmentOrders
                    .AnyAsync(o => o.ProductId == rule.ProductId && o.Status == "Pending");

                if (alreadyPending) continue;

                // Use raw SQL to insert without touching ApprovedBy column at all
                await _context.Database.ExecuteSqlRawAsync(
                    @"INSERT INTO ReplenishmentOrders 
                (ProductId, QuantityRequested, GeneratedAt, Status)
              VALUES 
                ({0}, {1}, {2}, {3})",
                    rule.ProductId,
                    rule.MaxLevel - stock.CurrentStock,
                    DateTime.UtcNow,
                    "Pending"
                );
            }
        }
    }
}