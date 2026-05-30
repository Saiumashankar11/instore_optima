using instore_optima.Domain.Entities;
using instore_optima.Domain.Interfaces;
using System.Text.RegularExpressions;

namespace instore_optima.Infrastructure.Services
{
    public class PONotificationService : IPONotificationService
    {
        private readonly IUserRepository _userRepo;
        private readonly ISupplierRepository _supplierRepo;
        private readonly IInternalMessageRepository _msgRepo;

        public PONotificationService(
            IUserRepository userRepo,
            ISupplierRepository supplierRepo,
            IInternalMessageRepository msgRepo)
        {
            _userRepo     = userRepo;
            _supplierRepo = supplierRepo;
            _msgRepo      = msgRepo;
        }

        public async Task NotifyPOCreatedAsync(PurchaseOrder po, int createdByUserId)
        {
            var supplier = await _supplierRepo.GetSupplierByIdAsync(po.SupplierId);
            var allUsers = await _userRepo.GetAllUsersAsync();

            var supplierSlug  = ToSlug(supplier?.Name ?? "supplier");
            var supplierEmail = $"{supplierSlug}@instore.com";
            var supplierName  = supplier?.Name ?? "Supplier";
            var deliveryDate  = po.ExpectedDeliveryDate.ToString("dd MMM yyyy");

            var subject = $"[PO #{po.PurchaseOrderId}] Delivery from {supplierName} ({supplierEmail}) — Due {deliveryDate}";

            var body = $@"From: {supplierEmail} (Automated Supplier Notification)

Dear Team,

A new Purchase Order has been issued and is awaiting delivery.

Purchase Order   : #{po.PurchaseOrderId}
Supplier         : {supplierName}
Supplier Email   : {supplierEmail}
Expected Delivery: {deliveryDate}
Replenishment #  : #{po.ReplenishmentOrderId}

Once the shipment is received, use the Mark as Delivered button below.
This will automatically update the stock, record an IN movement, generate a GRN, and mark the replenishment order as Fulfilled.

— InStore Optima System";

            var recipients = allUsers
                .Where(u => (u.Role == "Manager" || u.Role == "Staff") && u.UserId != createdByUserId);

            foreach (var recipient in recipients)
            {
                await _msgRepo.SendMessageAsync(new InternalMessage
                {
                    SenderId            = createdByUserId,
                    ReceiverId          = recipient.UserId,
                    Subject             = subject,
                    Body                = body,
                    MessageType         = "Request",
                    ActionType          = "MARK_PO_DELIVERED",
                    ActionPayload       = po.PurchaseOrderId.ToString(),
                    SenderDisplayName   = supplierName,
                    SenderDisplayEmail  = supplierEmail
                });
            }
        }

        private static string ToSlug(string name) =>
            Regex.Replace(name.ToLowerInvariant(), @"[^a-z0-9]", "");
    }
}
