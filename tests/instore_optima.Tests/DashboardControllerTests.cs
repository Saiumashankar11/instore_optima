// =============================================================================
// DashboardControllerTests.cs — Unit tests for the Dashboard summary endpoint
// =============================================================================
// These tests verify that DashboardController.GetSummary() aggregates data
// from the database correctly: product counts, supplier counts, order counts,
// low-stock detection, revenue calculation (only from completed payments), and
// the ordering of recent orders (newest first).
//
// Each test uses an isolated in-memory EF Core database (a fresh Guid-named DB
// per test) so tests cannot interfere with each other.
// =============================================================================
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
    // Helper: creates a fresh in-memory database for each test.
    // Using a unique name per call ensures tests are fully isolated.
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    /// <summary>
    /// Tests that the summary DTO is computed correctly when the database has
    /// real data: two products (one low-stock), one supplier, two orders, one
    /// completed payment. Verifies counts, revenue, and sort order.
    /// </summary>
    [Fact]
    public async Task Summary_ComputesCounts_LowStock_AndRevenue()
    {
        // Arrange — seed the in-memory database with controlled test data.
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
        // Only order 1 has a completed payment, so revenue should be 500 (not 800).
        ctx.Payments.Add(new Payment { PaymentId = 1, OrderId = 1, PaymentMethod = "Card", PaymentStatus = "Completed" });
        await ctx.SaveChangesAsync();

        // Act — call the controller directly (no HTTP overhead, no mocking needed).
        var result = await new DashboardController(ctx).GetSummary();

        // Assert — verify the shape and values of the response DTO.
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

    /// <summary>
    /// Edge-case test: an empty database should return all zeros, not throw
    /// NullReferenceException or return null fields.
    /// </summary>
    [Fact]
    public async Task Summary_OnEmptyDatabase_ReturnsZeros()
    {
        // Arrange — empty database, nothing seeded.
        using var ctx = NewContext();

        // Act
        var result = await new DashboardController(ctx).GetSummary();
        // Assert — all counts/revenue should default to zero, not blow up.
        var dto = Assert.IsType<DashboardSummaryDto>(Assert.IsType<OkObjectResult>(result).Value);

        Assert.Equal(0, dto.Products);
        Assert.Equal(0, dto.Orders);
        Assert.Equal(0, dto.Revenue);
        Assert.Empty(dto.RecentOrders);
    }
}
