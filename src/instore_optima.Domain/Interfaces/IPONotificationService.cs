// IPONotificationService — contract for sending notifications when a Purchase Order is created.
// Implementations typically email relevant staff (managers, procurement team)
// with the new PO's details so they can act on it promptly.
using instore_optima.Domain.Entities;

namespace instore_optima.Domain.Interfaces
{
    public interface IPONotificationService
    {
        /// <summary>
        /// Sends a notification (e.g. email) to relevant users announcing that a new
        /// Purchase Order has been raised. <paramref name="createdByUserId"/> identifies
        /// the user who created the PO for display in the notification.
        /// </summary>
        Task NotifyPOCreatedAsync(PurchaseOrder po, int createdByUserId);
    }
}
