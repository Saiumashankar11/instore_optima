// =============================================================================
// OrderItemRepositoryTests.cs — Auto-replenishment threshold behavior
// =============================================================================
// When an order item is created, stock is deducted. With NO explicit
// replenishment rule, an auto-replenishment order must be raised ONLY when the
// remaining stock falls to the critical midpoint (≤ MinStock / 2) — not merely
// below MinStock. e.g. MinStock 50 → trigger at ≤ 25, NOT at 48.
// =============================================================================
using instore_optima.Api.Repositories.Implementations;
using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace instore_optima.Tests;

public class OrderItemRepositoryTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    // Product with MinStock 50 (→ critical midpoint = 25), MaxStock 100.
    private static async Task<AppDbContext> SeededAsync(int currentStock)
    {
        var ctx = NewContext();
        ctx.Products.Add(new Products { ProductId = 1, Name = "Rice", Description = "5kg bag", Price = 10, MinStock = 50, MaxStock = 100 });
        ctx.Stocks.Add(new Stock { StockId = 1, ProductId = 1, CurrentStock = currentStock });
        ctx.Orders.Add(new Orders { OrderId = 1, UserId = 1, OrderDate = DateTime.UtcNow, Status = "Pending", TotalAmount = 0 });
        await ctx.SaveChangesAsync();
        return ctx;
    }

    [Fact]
    public async Task Order_DropsBelowMin_ButAboveHalf_DoesNotTriggerReplenishment()
    {
        using var ctx = await SeededAsync(currentStock: 60);
        var repo = new OrderItemRepository(ctx);

        // 60 - 12 = 48. Below MinStock (50) but above the midpoint (25) → NO replenishment.
        await repo.CreateOrderItemAsync(new Order_Items { OrderId = 1, ProductId = 1, Quantity = 12 });

        Assert.False(await ctx.ReplenishmentOrders.AnyAsync(r => r.ProductId == 1));
    }

    [Fact]
    public async Task Order_DropsToMidpointOrBelow_TriggersReplenishment()
    {
        using var ctx = await SeededAsync(currentStock: 30);
        var repo = new OrderItemRepository(ctx);

        // 30 - 10 = 20. At/below the midpoint (25) → a Pending replenishment is raised.
        await repo.CreateOrderItemAsync(new Order_Items { OrderId = 1, ProductId = 1, Quantity = 10 });

        Assert.True(await ctx.ReplenishmentOrders.AnyAsync(r => r.ProductId == 1 && r.Status == "Pending"));
    }
}
