using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities
{
    // DB Entity — records every meaningful action a user performs in the system.
    // Audit logs are written automatically so administrators can track who changed what and when.
    // This table is READ-ONLY for normal users; nothing is ever deleted from it.
    public class AuditLog
    {
        public int AuditLogId { get; set; }

        public int UserId { get; set; } // FK → User who performed the action

        public string Action { get; set; }      // e.g. "Create", "Update", "Delete"
        public string EntityType { get; set; }  // name of the affected table/class, e.g. "Order", "Product"
        public int EntityId { get; set; }       // primary-key value of the affected record

        public string Description { get; set; } // human-readable summary of what changed
        public string OldValues { get; set; }   // JSON snapshot of the record BEFORE the change
        public string NewValues { get; set; }   // JSON snapshot of the record AFTER the change
        public DateTime CreatedAt { get; set; } // UTC timestamp when the action occurred
    }
}
