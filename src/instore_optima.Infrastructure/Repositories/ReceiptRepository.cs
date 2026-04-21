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

        public async Task<IEnumerable<Receipt>> GetAllReceiptsAsync()
        {
            return await _context.Receipts
                .AsNoTracking()
                .OrderByDescending(r => r.GeneratedAt)
                .ToListAsync();
        }

        public async Task<Receipt?> GetReceiptByIdAsync(int receiptId)
        {
            return await _context.Receipts
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);
        }

        public async Task<Receipt> CreateReceiptAsync(Receipt receipt)
        {
            receipt.GeneratedAt = DateTime.UtcNow;
            await _context.Receipts.AddAsync(receipt);
            await _context.SaveChangesAsync();
            return receipt;
        }

        public async Task<Receipt> UpdateReceiptAsync(Receipt receipt)
        {
            _context.Receipts.Update(receipt);
            await _context.SaveChangesAsync();
            return receipt;
        }
    }
}