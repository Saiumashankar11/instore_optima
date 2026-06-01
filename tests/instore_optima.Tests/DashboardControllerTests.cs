using instore_optima.Api.Controllers;
using instore_optima.Application.DTOs;
using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace instore_optima.Tests;

public class DashboardControllerTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task Summary_ComputesCounts_LowStock_AndRevenue()
    {
        using var ctx = NewContext();

        ctx.Products.AddRange(
            new Products { ProductId = 1, Name = "A", Description = "desc A", MinStock = 20 },
            new Products { ProductId = 2, Name = "B", Description = "desc B", MinStock = 10 });
        ctx.Stocks.AddRange(
            new Stock { StockId = 1, ProductId = 1, CurrentStock = 20 },  // == min  → low (<=)
            new Stock { StockId = 2, ProductId = 2, CurrentStock = 50 }); // above   → not low
        ctx.Suppliers.Add(new Supplier { SupplierId = 1, Name = "S1", Address = "Addr", Contact = "999", Email = "s1@x.com" });
        ctx.Orders.AddRange(
            new Orders { OrderId = 1, UserId = 1, OrderDate = DateTime.UtcNow.AddDays(-1), Status = "Completed", TotalAmount = 500 },
            new Orders { OrderId = 2, UserId = 1, OrderDate = DateTime.UtcNow,             Status = "Pending",   TotalAmount = 300 });
        ctx.Payments.Add(new Payment { PaymentId = 1, OrderId = 1, PaymentMethod = "Card", PaymentStatus = "Completed" });
        await ctx.SaveChangesAsync();

        var result = await new DashboardController(ctx).GetSummary();

        var ok  = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<DashboardSummaryDto>(ok.Value);

        Assert.Equal(2, dto.Products);
        Assert.Equal(1, dto.Suppliers);
        Assert.Equal(2, dto.Orders);
        Assert.Equal(1, dto.LowStock);          // only product 1 (20 <= 20)
        Assert.Equal(500, dto.Revenue);          // only the order with a completed payment
        Assert.Equal(2, dto.RecentOrders.Count);
        Assert.Equal(2, dto.RecentOrders[0].OrderId); // newest first
    }

    [Fact]
    public async Task Summary_OnEmptyDatabase_ReturnsZeros()
    {
        using var ctx = NewContext();

        var result = await new DashboardController(ctx).GetSummary();
        var dto = Assert.IsType<DashboardSummaryDto>(Assert.IsType<OkObjectResult>(result).Value);

        Assert.Equal(0, dto.Products);
        Assert.Equal(0, dto.Orders);
        Assert.Equal(0, dto.Revenue);
        Assert.Empty(dto.RecentOrders);
    }
}
