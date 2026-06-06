// IPaymentRepository — contract for managing Payment records.
// Creating a payment also auto-generates an invoice and moves the order to "Processing".
// Marking a payment Completed auto-creates a receipt and moves the order to "Completed".
// All multi-step writes execute inside a database transaction so data stays consistent.
// Valid payment statuses: Pending | Completed | Failed | Refunded.
using instore_optima.Domain.Entities;

namespace instore_optima.Api.Repositories.Interfaces
{
    public interface IPaymentRepository
    {
        /// <summary>Returns all payment records in the system.</summary>
        Task<IEnumerable<Payment>> GetAllPaymentsAsync();

        /// <summary>Returns a single payment by its primary key. Returns null if not found.</summary>
        Task<Payment?> GetPaymentByIdAsync(int paymentId);

        /// <summary>Returns the payment associated with a specific order. Returns null if no payment exists yet.</summary>
        Task<Payment?> GetPaymentByOrderIdAsync(int orderId);

        /// <summary>
        /// Records a new payment for an order. Atomically: sets PaymentDate, moves the order to "Processing",
        /// and auto-creates an invoice if one doesn't already exist.
        /// Throws InvalidOperationException if a payment already exists for the order.
        /// </summary>
        Task<Payment> CreatePaymentAsync(Payment payment);

        /// <summary>
        /// Updates a payment's status. When set to "Completed", atomically auto-creates a receipt,
        /// moves the linked order to "Completed", and marks the linked invoice as "Paid".
        /// </summary>
        Task<Payment> UpdatePaymentStatusAsync(int paymentId, string status);

        /// <summary>
        /// Deletes a payment and atomically removes its linked receipt and invoice.
        /// Returns false if the payment doesn't exist.
        /// </summary>
        Task<bool> DeletePaymentAsync(int paymentId);
    }
}