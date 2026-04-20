using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities
{
    public class TaskItem
    {
        public int TaskItemId { get; set; }

        public int AssignedTo { get; set; }

        public string RelatedEntity { get; set; }
        public string Description { get; set; }

        public DateTime DueDate { get; set; }
        public string Priority { get; set; }
        public string Status { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
