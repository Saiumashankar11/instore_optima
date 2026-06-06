// IPurchaseOrderRepository — contract for managing Purchase Orders (POs).
// A PO is raised against a supplier to fulfil a ReplenishmentOrder.
// When a PO is marked "Delivered", stock is automatically increased and a GRN is issued.
// When cancelled or deleted, the linked ReplenishmentOrder reverts to "Approved"
// so a new PO can be raised against it. Delivered POs are permanent and cannot be deleted.
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using instore_optima.Domain.Entities;

namespace instore_optima.Domain.Interfaces
{
    public interface IPurchaseOrderRepository
    {
        /// <summary>Returns all purchase orders in the system.</summary>
        Task<IEnumerable<PurchaseOrder>> GetAllPurchaseOrdersAsync();

        /// <summary>Returns a single purchase order by its primary key. Returns null if not found.</summary>
        Task<PurchaseOrder?> GetPOByIdAsync(int poId);

        /// <summary>Persists a new purchase order and returns it with its generated ID.</summary>
        Task<PurchaseOrder> CreatePurchaseOrderAsync(PurchaseOrder po);

        /// <summary>
        /// Updates the PO status. "Delivered" triggers stock increase, GRN generation, and marks the
        /// replenishment order "Fulfilled". "Cancelled" reverts the replenishment order to "Approved".
        /// Throws InvalidOperationException if the PO is already delivered.
        /// </summary>
        Task<PurchaseOrder> UpdatePOStatusAsync(int poId, string status); // Status: Pending | Delivered | Cancelled

        /// <summary>
        /// Deletes a PO and reverts the linked replenishment order to "Approved".
        /// Returns false if the PO doesn't exist. Throws InvalidOperationException for delivered POs.
        /// </summary>
        Task<bool> DeletePurchaseOrderAsync(int poId);
    }
}