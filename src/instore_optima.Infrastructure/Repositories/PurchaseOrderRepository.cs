using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using instore_optima.Domain.Entities;
using instore_optima.Domain.Interfaces;
using instore_optima.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Infrastructure.Repositories
{
    public class PurchaseOrderRepository : IPurchaseOrderRepository
    {
        private readonly AppDbContext _context;

        public PurchaseOrderRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<PurchaseOrder>> GetAllPurchaseOrdersAsync()
        {
            return await _context.PurchaseOrders.ToListAsync();
        }

        public async Task<PurchaseOrder?> GetPOByIdAsync(int poId)
        {
            return await _context.PurchaseOrders
                .FirstOrDefaultAsync(po => po.PurchaseOrderId == poId);
        }

        public async Task<PurchaseOrder> CreatePurchaseOrderAsync(PurchaseOrder po)
        {
            _context.PurchaseOrders.Add(po);
            await _context.SaveChangesAsync();
            return po;
        }

        public async Task<PurchaseOrder> UpdatePOStatusAsync(int poId, string status)
        {
            var po = await _context.PurchaseOrders
                .FirstOrDefaultAsync(po => po.PurchaseOrderId == poId);

            if (po == null)
                throw new Exception($"PurchaseOrder with ID {poId} not found");

            po.Status = status;
            await _context.SaveChangesAsync();
            return po;
        }
    }
}
