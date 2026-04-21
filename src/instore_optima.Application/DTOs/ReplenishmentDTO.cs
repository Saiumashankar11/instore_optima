namespace instore_optima.Application.DTOs
{
    // ── Rule DTOs ────────────────────────────────────────────────────

    public class ReplenishmentRuleCreateDTO
    {
        public int ProductId { get; set; }
        public int MinLevel { get; set; }
        public int MaxLevel { get; set; }
        public int ReorderPoint { get; set; }
    }

    public class ReplenishmentRuleUpdateDTO
    {
        public int MinLevel { get; set; }
        public int MaxLevel { get; set; }
        public int ReorderPoint { get; set; }
        public string Status { get; set; } = string.Empty;  // Active | Inactive
    }

    public class ReplenishmentRuleResponseDTO
    {
        public int RuleId { get; set; }
        public int ProductId { get; set; }
        public int MinLevel { get; set; }
        public int MaxLevel { get; set; }
        public int ReorderPoint { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    // ── Replenishment Order DTOs ──────────────────────────────────────

    public class ReplenishmentOrderCreateDTO
    {
        public int ProductId { get; set; }
        public int QuantityRequested { get; set; }
    }

    public class ReplenishmentOrderUpdateDTO
    {
        public string Status { get; set; } = string.Empty;  // Pending | Approved | Rejected
        public int ApprovedBy { get; set; }
    }

    public class ReplenishmentOrderResponseDTO
    {
        public int ReplenishmentOrderId { get; set; }
        public int ProductId { get; set; }
        public int QuantityRequested { get; set; }
        public DateTime GeneratedAt { get; set; }
        public int? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}