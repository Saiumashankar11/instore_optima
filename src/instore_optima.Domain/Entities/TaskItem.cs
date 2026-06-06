using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities
{
    // DB Entity — a to-do task assigned to a user within the system.
    // Tasks can be linked to another entity (e.g. a PurchaseOrder or ReplenishmentOrder)
    // to give staff clear action items to follow up on.
    public class TaskItem
    {
        public int TaskItemId { get; set; }

        public int AssignedTo { get; set; } // FK → User responsible for completing this task

        public string RelatedEntity { get; set; } // optional reference to the entity this task concerns, e.g. "PurchaseOrder:42"
        public string Description { get; set; }   // what needs to be done

        public DateTime DueDate { get; set; }  // deadline for completing the task
        public string Priority { get; set; }   // urgency level, e.g. "Low", "Medium", "High"
        public string Status { get; set; }     // current state, e.g. "Open", "InProgress", "Completed", "Cancelled"

        public DateTime CreatedAt { get; set; } // when the task was created
    }
}
