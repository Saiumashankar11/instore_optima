using instore_optima.Domain.Entities;

namespace instore_optima.Domain.Interfaces
{
    public interface IPONotificationService
    {
        Task NotifyPOCreatedAsync(PurchaseOrder po, int createdByUserId);
    }
}
