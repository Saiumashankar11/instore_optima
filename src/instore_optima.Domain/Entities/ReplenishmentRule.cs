using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities
{
    public class ReplenishmentRule
    {
        public int RuleId { get; set; }

        public int ProductId { get; set; }

        public int MinLevel { get; set; }
        public int MaxLevel { get; set; }
        public int ReorderPoint { get; set; }

        public DateTime CreatedAt { get; set; }
        public string Status { get; set; }
    }
}
