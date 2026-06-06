// =============================================================================
// PaymentRepositoryTests.cs — Unit tests for PaymentRepository business logic
// =============================================================================
// PaymentRepository does more than just save a row — it runs a small workflow:
//   CreatePaymentAsync  → moves the order to "Processing", creates an Invoice.
//   UpdatePaymentStatus → when set to "Completed", marks order & invoice done
//                         and creates a Receipt.
//
// These tests verify that workflow using an in-memory EF database so no real
// SQL Server is required. NullLogger is used to satisfy the repository's
// logger dependency without producing any real log output.
// =============================================================================
using instore_optima.Api.Repositories.Implementations;
using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace instore_optima.Tests;

public class PaymentRepositoryTests
{
    // Creates an isolated in-memory database for each test. Guid name ensures
    // tests running in parallel don't share data.
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    // NullLogger discards all log messages — avoids setting up a real logger
    // while still satisfying the constructor parameter.
    private static PaymentRepository NewRepo(AppDbContext ctx) =>
        new(ctx, NullLogger<PaymentRepository>.Instance);

    /// <summary>
    /// Happy-path: creating a payment for a Pending order should advance the
    /// order status to "Processing" and automatically generate a new Invoice
    /// with status "Issued" and the same total amount as the order.
    /// </summary>
    [Fact]
    public async Task CreatePayment_MovesOrderToProcessing_AndCreatesIssuedInvoice()
    {
        // Arrange
        using var ctx = NewContext();
        ctx.Orders.Add(new Orders { OrderId = 1, UserId = 1, OrderDate = DateTime.UtcNow, Status = "Pending", TotalAmount = 500 });
        await ctx.SaveChangesAsync();

        // Act
        var repo = NewRepo(ctx);
        await repo.CreatePaymentAsync(new Payment { OrderId = 1, PaymentMethod = "Card", PaymentStatus = "Pending" });

        // Assert — order status updated and invoice created.
        var order = await ctx.Orders.FindAsync(1);
        var invoice = await ctx.Invoices.FirstOrDefaultAsync(i => i.OrderId == 1);

        Assert.Equal("Processing", order!.Status);
        Assert.NotNull(invoice);
        Assert.Equal("Issued", invoice!.Status);
        Assert.Equal(500, invoice.TotalAmount);
    }

    /// <summary>
    /// Guard test: an order can only have one payment. Attempting to create a
    /// second payment for the same order should throw InvalidOperationException.
    /// This prevents double-charging a customer.
    /// </summary>
    [Fact]
    public async Task CreatePayment_SecondPaymentForSameOrder_Throws()
    {
        // Arrange
        using var ctx = NewContext();
        ctx.Orders.Add(new Orders { OrderId = 2, UserId = 1, OrderDate = DateTime.UtcNow, Status = "Pending", TotalAmount = 100 });
        await ctx.SaveChangesAsync();
        var repo = NewRepo(ctx);

        // Act — first payment succeeds.
        await repo.CreatePaymentAsync(new Payment { OrderId = 2, PaymentMethod = "Cash", PaymentStatus = "Pending" });

        // Assert — second payment for the same order must throw.
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            repo.CreatePaymentAsync(new Payment { OrderId = 2, PaymentMethod = "UPI", PaymentStatus = "Pending" }));
    }

    /// <summary>
    /// End-to-end workflow test: marking a payment as Completed should cascade —
    /// the order moves to "Completed", the invoice moves to "Paid", and a new
    /// Receipt is generated with the correct amount paid.
    /// </summary>
    [Fact]
    public async Task MarkCompleted_CompletesOrder_PaysInvoice_AndCreatesReceipt()
    {
        // Arrange — create an order and a pending payment.
        using var ctx = NewContext();
        ctx.Orders.Add(new Orders { OrderId = 3, UserId = 1, OrderDate = DateTime.UtcNow, Status = "Pending", TotalAmount = 750 });
        await ctx.SaveChangesAsync();
        var repo = NewRepo(ctx);
        var payment = await repo.CreatePaymentAsync(new Payment { OrderId = 3, PaymentMethod = "Card", PaymentStatus = "Pending" });

        // Act — mark the payment as completed, triggering the cascade.
        await repo.UpdatePaymentStatusAsync(payment.PaymentId, "Completed");

        // Assert — all three side-effects must have occurred.
        var order   = await ctx.Orders.FindAsync(3);
        var invoice = await ctx.Invoices.FirstOrDefaultAsync(i => i.OrderId == 3);
        var receipt = await ctx.Receipts.FirstOrDefaultAsync(r => r.PaymentId == payment.PaymentId);

        Assert.Equal("Completed", order!.Status);
        Assert.Equal("Paid", invoice!.Status);
        Assert.NotNull(receipt);
        Assert.Equal(750, receipt!.AmountPaid);
    }

    /// <summary>
    /// Guard test: passing an unrecognized status string (not "Completed",
    /// "Failed", etc.) should throw ArgumentException so callers don't silently
    /// put the system into an undefined state.
    /// </summary>
    [Fact]
    public async Task UpdatePaymentStatus_InvalidStatus_Throws()
    {
        // Arrange
        using var ctx = NewContext();
        ctx.Orders.Add(new Orders { OrderId = 4, UserId = 1, OrderDate = DateTime.UtcNow, Status = "Pending", TotalAmount = 10 });
        await ctx.SaveChangesAsync();
        var repo = NewRepo(ctx);
        var payment = await repo.CreatePaymentAsync(new Payment { OrderId = 4, PaymentMethod = "Cash", PaymentStatus = "Pending" });

        // Act + Assert — "Bogus" is not a valid payment status.
        await Assert.ThrowsAsync<ArgumentException>(() =>
            repo.UpdatePaymentStatusAsync(payment.PaymentId, "Bogus"));
    }
}
