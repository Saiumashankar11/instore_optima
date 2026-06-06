// ReceiptRepository — EF Core data access for the Receipt entity via AppDbContext.
// Receipts are automatically created by PaymentRepository when a payment is marked "Completed".
// This repository exposes direct CRUD for cases where receipts need to be queried or corrected.
// Read queries use AsNoTracking() since no updates follow immediately after a read here.
using instore_optima.Domain.Entities;
using instore_optima.Domain.Interfaces;
using instore_optima.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Infrastructure.Repositories
{
    public class ReceiptRepository : IReceiptRepository
    {
        private readonly AppDbContext _context;

        public ReceiptRepository(AppDbContext context)
        {
            _context = context;
        }

        // Returns all receipts ordered by most recently generated first
        public async Task<IEnumerable<Receipt>> GetAllReceiptsAsync()
        {
            return await _context.Receipts
                .AsNoTracking()                          // read-only: skip change tracking for performance
                .OrderByDescending(r => r.GeneratedAt)  // newest receipts first
                .ToListAsync();
        }

        public async Task<Receipt?> GetReceiptByIdAsync(int receiptId)
        {
            return await _context.Receipts
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);
        }

        // Look up a receipt by the associated payment — useful after a payment is completed
        public async Task<Receipt?> GetReceiptByPaymentIdAsync(int paymentId)
        {
            return await _context.Receipts
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.PaymentId == paymentId);
        }

        public async Task<Receipt> CreateReceiptAsync(Receipt receipt)
        {
            receipt.GeneratedAt = DateTime.UtcNow;  // always set server-side
            await _context.Receipts.AddAsync(receipt);
            await _context.SaveChangesAsync();
            return receipt;
        }

        public async Task<Receipt> UpdateReceiptAsync(Receipt receipt)
        {
            // EF Update marks all columns as modified — used when correcting receipt details
            _context.Receipts.Update(receipt);
            await _context.SaveChangesAsync();
            return receipt;
        }
    }
}