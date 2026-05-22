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

            // When delivered: update stock, mark replenishment fulfilled, issue GRN
            if (status == "Delivered")
            {
                // Stamp GRN number and delivery time on the PO itself
                po.GrnNumber = $"GRN-{DateTime.UtcNow.Year}-{poId:D4}";
                po.DeliveredAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                var replenOrder = await _context.ReplenishmentOrders
                    .FirstOrDefaultAsync(r => r.ReplenishmentOrderId == po.ReplenishmentOrderId);
                if (replenOrder != null)
                {
                    // Update stock level
                    var stock = await _context.Stocks
                        .FirstOrDefaultAsync(s => s.ProductId == replenOrder.ProductId);
                    if (stock != null)
                    {
                        stock.CurrentStock += replenOrder.QuantityRequested;
                        stock.LastUpdated = DateTime.UtcNow;
                    }

                    // Mark replenishment order as Fulfilled
                    replenOrder.Status = "Fulfilled";
                    replenOrder.ApprovedAt = DateTime.UtcNow;

                    // Record StockMovement IN for audit trail
                    _context.StockMovements.Add(new StockMovement
                    {
                        ProductId = replenOrder.ProductId,
                        Quantity = replenOrder.QuantityRequested,
                        MovementType = "IN",
                        PerformedBy = 1,
                        Reason = $"PO #{poId} delivered from supplier",
                        PerformedAt = DateTime.UtcNow
                    });

                    await _context.SaveChangesAsync();
                }
            }

            return po;
        }
    }
}
