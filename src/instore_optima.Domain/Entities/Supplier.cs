using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities
{
    // DB Entity — a vendor/supplier that provides products to the store.
    // Suppliers are referenced by Products and PurchaseOrders.
    public class Supplier
    {
        public int SupplierId { get; set; }
        public string Name { get; set; }
        public string Contact { get; set; } // contact person's name or phone number for this supplier
        public string Email { get; set; }
        public string Address { get; set; } // physical or mailing address of the supplier
    }
}

