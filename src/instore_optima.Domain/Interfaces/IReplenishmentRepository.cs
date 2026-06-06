// IReplenishmentRepository — contract for the stock replenishment sub-system.
// Manages two separate concerns:
//   1. ReplenishmentRules  — per-product rules that define MinLevel, MaxLevel, and ReorderPoint.
//   2. ReplenishmentOrders — orders generated (manually or automatically) to restock a product.
// TriggerAutoReplenishmentAsync scans all active rules and creates Pending orders for any
// product whose stock has dropped to or below its ReorderPoint.
using instore_optima.Domain.Entities;

namespace instore_optima.Infrastructure.Interfaces
{
	public interface IReplenishmentRepository
	{
		// ── Replenishment Rules ──────────────────────────────────────────

		/// <summary>Returns all replenishment rules defined in the system.</summary>
		Task<IEnumerable<ReplenishmentRule>> GetAllRulesAsync();

		/// <summary>Returns a single rule by its primary key. Returns null if not found.</summary>
		Task<ReplenishmentRule?> GetRuleByIdAsync(int ruleId);

		/// <summary>Returns the active rule for a specific product. Returns null if no rule is configured.</summary>
		Task<ReplenishmentRule?> GetRuleByProductIdAsync(int productId);

		/// <summary>Creates a new rule. CreatedAt is set server-side; Status defaults to "Active".</summary>
		Task<ReplenishmentRule> CreateRuleAsync(ReplenishmentRule rule);

		/// <summary>Updates a rule's threshold values (MinLevel, MaxLevel, ReorderPoint, Status). Returns null if not found.</summary>
		Task<ReplenishmentRule?> UpdateRuleAsync(int ruleId, ReplenishmentRule updated);

		/// <summary>Deletes a rule by ID. Returns false if not found.</summary>
		Task<bool> DeleteRuleAsync(int ruleId);

		// ── Replenishment Orders ─────────────────────────────────────────

		/// <summary>Returns all replenishment orders, newest first.</summary>
		Task<IEnumerable<ReplenishmentOrder>> GetAllOrdersAsync();

		/// <summary>Returns a single replenishment order by its primary key. Returns null if not found.</summary>
		Task<ReplenishmentOrder?> GetOrderByIdAsync(int replenishmentOrderId);

		/// <summary>Creates a new replenishment order. GeneratedAt is set server-side; Status defaults to "Pending".</summary>
		Task<ReplenishmentOrder> CreateOrderAsync(ReplenishmentOrder order);

		/// <summary>Updates the order status and records which user approved it (for approve/reject flows).</summary>
		Task<ReplenishmentOrder?> UpdateOrderStatusAsync(int replenishmentOrderId, string status, int approvedBy);

		/// <summary>Updates the order status only (notes parameter is accepted but not persisted — no Notes field on entity).</summary>
		Task<ReplenishmentOrder?> UpdateOrderStatusAsync(int replenishmentOrderId, string status, string notes);

		/// <summary>
		/// Deletes a replenishment order. Returns false if not found.
		/// Throws InvalidOperationException if a purchase order is already linked to this replenishment order.
		/// </summary>
		Task<bool> DeleteOrderAsync(int replenishmentOrderId);

		/// <summary>
		/// Scans all active replenishment rules. For each product whose CurrentStock is at or below
		/// its ReorderPoint and has no existing Pending order, inserts a new Pending replenishment order.
		/// Uses raw SQL to avoid EF model constraints on nullable columns.
		/// </summary>
		Task TriggerAutoReplenishmentAsync();
	}
}
