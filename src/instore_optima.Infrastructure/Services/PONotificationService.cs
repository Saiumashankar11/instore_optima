// =============================================================================
// PONotificationService.cs — Internal messaging for new Purchase Orders
// =============================================================================
// When a Purchase Order (PO) is created, this service broadcasts an
// in-app InternalMessage to every Manager and Staff user (except the creator)
// so the team knows a delivery is expected. The message includes an
// ActionType of "MARK_PO_DELIVERED" so the frontend can render a button
// that lets recipients mark the PO as delivered without leaving the inbox.
// =============================================================================
using instore_optima.Domain.Entities;
using instore_optima.Domain.Interfaces;
using System.Text.RegularExpressions;

namespace instore_optima.Infrastructure.Services
{
    /// <summary>
    /// Sends an internal message to all relevant users when a new Purchase Order
    /// is raised, so staff know to expect a delivery.
    /// </summary>
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

        /// <summary>
        /// Called immediately after a new PurchaseOrder is saved to the database.
        /// Looks up the supplier name, builds a descriptive message body, and
        /// sends it as an InternalMessage to every Manager/Staff except the creator.
        /// </summary>
        public async Task NotifyPOCreatedAsync(PurchaseOrder po, int createdByUserId)
        {
            var supplier = await _supplierRepo.GetSupplierByIdAsync(po.SupplierId);
            var allUsers = await _userRepo.GetAllUsersAsync();

            // Derive a fake "supplier email" from the supplier's name for display
            // purposes (the system doesn't actually email the supplier here).
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

            // Only notify Managers and Staff. Exclude the user who created the PO
            // (they already know about it) and Inactive users.
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

        // Converts a supplier name like "Fresh Foods Ltd." into a URL/email-safe
        // slug like "freshfoodsltd" by removing everything that is not a–z or 0–9.
        private static string ToSlug(string name) =>
            Regex.Replace(name.ToLowerInvariant(), @"[^a-z0-9]", "");
    }
}
