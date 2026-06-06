using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities

{

    // DB Entity — defines the stock thresholds that govern when automatic replenishment is triggered for a product.
    // Each product can have its own rule. The system evaluates these rules to decide when to raise a ReplenishmentOrder.
    public class ReplenishmentRule
    {

        public int RuleId { get; set; }


        public int ProductId { get; set; } // FK → Products; the product this rule applies to


        public int MinLevel { get; set; }     // minimum acceptable stock quantity (same as Products.MinStock but can be overridden per-rule)

        public int MaxLevel { get; set; }     // maximum stock to aim for when replenishing (target fill level)

        public int ReorderPoint { get; set; } // stock level at which a replenishment order should be automatically raised


        public DateTime CreatedAt { get; set; } // when this rule was configured

        public string Status { get; set; } // "Active" = rule is in effect; "Inactive" = rule is paused/disabled

    }

}