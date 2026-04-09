using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities
{
    public class AuditLog
    {
        public int AuditLogId { get; set; }

        public int UserId { get; set; }

        public string Action { get; set; }
        public string EntityType { get; set; }
        public int EntityId { get; set; }

        public string Description { get; set; }
        public string OldValues { get; set; }
        public string NewValues { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
