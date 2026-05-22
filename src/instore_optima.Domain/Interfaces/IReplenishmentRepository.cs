using instore_optima.Domain.Entities;

namespace instore_optima.Infrastructure.Interfaces
{
	public interface IReplenishmentRepository
	{
		// Rules
		Task<IEnumerable<ReplenishmentRule>> GetAllRulesAsync();
		Task<ReplenishmentRule?> GetRuleByIdAsync(int ruleId);
		Task<ReplenishmentRule?> GetRuleByProductIdAsync(int productId);
		Task<ReplenishmentRule> CreateRuleAsync(ReplenishmentRule rule);
		Task<ReplenishmentRule?> UpdateRuleAsync(int ruleId, ReplenishmentRule updated);
		Task<bool> DeleteRuleAsync(int ruleId);

		// Orders
		Task<IEnumerable<ReplenishmentOrder>> GetAllOrdersAsync();
		Task<ReplenishmentOrder?> GetOrderByIdAsync(int replenishmentOrderId);
		Task<ReplenishmentOrder> CreateOrderAsync(ReplenishmentOrder order);
		Task<ReplenishmentOrder?> UpdateOrderStatusAsync(int replenishmentOrderId, string status, int approvedBy);
		Task<ReplenishmentOrder?> UpdateOrderStatusAsync(int replenishmentOrderId, string status, string notes);
		Task<bool> DeleteOrderAsync(int replenishmentOrderId);
		Task TriggerAutoReplenishmentAsync();
	}
}
