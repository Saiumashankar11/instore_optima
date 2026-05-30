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

            if (po.Status == "Delivered")
                throw new InvalidOperationException($"Purchase order #{poId} is already marked as delivered.");

            po.Status = status;
            await _context.SaveChangesAsync();

            // When delivered: update stock, mark replenishment fulfilled, issue GRN
            if (status == "Delivered")
            {
                po.GrnNumber = $"GRN-{DateTime.UtcNow.Year}-{poId:D4}";
                po.DeliveredAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                var replenOrder = await _context.ReplenishmentOrders
                    .FirstOrDefaultAsync(r => r.ReplenishmentOrderId == po.ReplenishmentOrderId);
                if (replenOrder != null)
                {
                    var stock = await _context.Stocks
                        .FirstOrDefaultAsync(s => s.ProductId == replenOrder.ProductId);
                    if (stock != null)
                    {
                        stock.CurrentStock += replenOrder.QuantityRequested;
                        stock.LastUpdated = DateTime.UtcNow;
                    }
                    else
                    {
                        _context.Stocks.Add(new Stock
                        {
                            ProductId    = replenOrder.ProductId,
                            CurrentStock = replenOrder.QuantityRequested,
                            LastUpdated  = DateTime.UtcNow
                        });
                    }

                    replenOrder.Status = "Fulfilled";
                    replenOrder.ApprovedAt = DateTime.UtcNow;

                    _context.StockMovements.Add(new StockMovement
                    {
                        ProductId    = replenOrder.ProductId,
                        Quantity     = replenOrder.QuantityRequested,
                        MovementType = "IN",
                        PerformedBy  = replenOrder.ApprovedBy ?? po.SupplierId, // use approver if set
                        Reason       = $"PO #{poId} delivered from supplier",
                        PerformedAt  = DateTime.UtcNow
                    });

                    await _context.SaveChangesAsync();
                }
            }

            // When cancelled: revert linked ReplenishmentOrder back to Approved
            // so it can be re-linked to a new PO
            if (status == "Cancelled")
            {
                var replenOrder = await _context.ReplenishmentOrders
                    .FirstOrDefaultAsync(r => r.ReplenishmentOrderId == po.ReplenishmentOrderId);
                if (replenOrder != null && replenOrder.Status != "Fulfilled")
                {
                    replenOrder.Status = "Approved";
                    await _context.SaveChangesAsync();
                }
            }

            return po;
        }

        public async Task<bool> DeletePurchaseOrderAsync(int poId)
        {
            var po = await _context.PurchaseOrders.FindAsync(poId);
            if (po == null) return false;

            if (po.Status == "Delivered")
                throw new InvalidOperationException(
                    $"Purchase order #{poId} has already been delivered and cannot be deleted. Delivered POs are permanent records.");

            // Revert linked ReplenishmentOrder back to Approved so it can get a new PO
            var replenOrder = await _context.ReplenishmentOrders
                .FirstOrDefaultAsync(r => r.ReplenishmentOrderId == po.ReplenishmentOrderId);
            if (replenOrder != null && replenOrder.Status != "Fulfilled")
            {
                replenOrder.Status = "Approved";
            }

            _context.PurchaseOrders.Remove(po);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
