using instore_optima.Domain.Entities;

namespace instore_optima.Api.Repositories.Interfaces
{
    public interface IPaymentRepository
    {
        Task<IEnumerable<Payment>> GetAllPaymentsAsync();
        Task<Payment?> GetPaymentByIdAsync(int paymentId);
        Task<Payment?> GetPaymentByOrderIdAsync(int orderId);
        Task<Payment> CreatePaymentAsync(Payment payment);
        Task<Payment> UpdatePaymentStatusAsync(int paymentId, string status);
    }
}