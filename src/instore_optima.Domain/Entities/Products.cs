using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities

{

    // DB Entity — represents a product sold or stocked in the store.
    // Products are linked to a supplier and drive the stock and replenishment logic.
    public class Products
    {

        public int ProductId { get; set; }

        public string Name { get; set; }

        public string Description { get; set; }

        public decimal Price { get; set; } // current selling price per unit

        public int MinStock { get; set; } // alert threshold — if CurrentStock falls below this, replenishment is triggered

        public int MaxStock { get; set; } // upper stock limit — replenishment orders should not exceed this level


        public int SupplierId { get; set; } // FK → Supplier; the vendor who provides this product

    }

}