// DTOs — request/response shapes for the replenishment sub-system.
// Contains two groups: ReplenishmentRule (stock thresholds per product) and
// ReplenishmentOrder (internal restocking requests that lead to PurchaseOrders).
namespace instore_optima.Application.DTOs
{
    // ── Rule DTOs ────────────────────────────────────────────────────

    // Request body for POST /api/replenishment-rules — defines stock thresholds for a product.
    public class ReplenishmentRuleCreateDTO
    {
        public int ProductId { get; set; }    // FK reference — which product this rule governs
        public int MinLevel { get; set; }     // alert threshold: replenishment is triggered when stock falls below this
        public int MaxLevel { get; set; }     // target fill level when restocking
        public int ReorderPoint { get; set; } // stock level at which the system automatically raises a ReplenishmentOrder
    }

    // Request body for PUT /api/replenishment-rules/{id} — adjusts thresholds or toggles the rule on/off.
    public class ReplenishmentRuleUpdateDTO
    {
        public int MinLevel { get; set; }
        public int MaxLevel { get; set; }
        public int ReorderPoint { get; set; }
        public string Status { get; set; } = string.Empty;  // Active | Inactive
    }

    // Response shape for GET /api/replenishment-rules.
    public class ReplenishmentRuleResponseDTO
    {
        public int RuleId { get; set; }
        public int ProductId { get; set; }
        public int MinLevel { get; set; }
        public int MaxLevel { get; set; }
        public int ReorderPoint { get; set; }
        public string Status { get; set; } = string.Empty; // "Active" or "Inactive"
        public DateTime CreatedAt { get; set; }
    }

    // ── Replenishment Order DTOs ──────────────────────────────────────

    // Request body for POST /api/replenishment-orders — raises an internal request to restock a product.
    public class ReplenishmentOrderCreateDTO
    {
        public int ProductId { get; set; }           // which product needs restocking
        public int QuantityRequested { get; set; }   // how many units to order
    }

    // Request body for PUT /api/replenishment-orders/{id} — records an approval or rejection decision.
    public class ReplenishmentOrderUpdateDTO
    {
        public string Status { get; set; } = string.Empty;  // Pending | Approved | Rejected
        public int ApprovedBy { get; set; }                  // FK reference — UserId of the manager making the decision
    }

    // Response shape for GET /api/replenishment-orders.
    public class ReplenishmentOrderResponseDTO
    {
        public int ReplenishmentOrderId { get; set; }
        public int ProductId { get; set; }
        public int QuantityRequested { get; set; }
        public DateTime GeneratedAt { get; set; }
        public int? ApprovedBy { get; set; }       // null if still awaiting a decision
        public DateTime? ApprovedAt { get; set; }  // null if still awaiting a decision
        public string Status { get; set; } = string.Empty; // "Pending", "Approved", "Rejected", or "Fulfilled"
    }
}