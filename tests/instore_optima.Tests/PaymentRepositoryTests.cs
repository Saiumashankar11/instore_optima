using instore_optima.Api.Repositories.Implementations;
using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace instore_optima.Tests;

public class PaymentRepositoryTests
{
    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static PaymentRepository NewRepo(AppDbContext ctx) =>
        new(ctx, NullLogger<PaymentRepository>.Instance);

    [Fact]
    public async Task CreatePayment_MovesOrderToProcessing_AndCreatesIssuedInvoice()
    {
        using var ctx = NewContext();
        ctx.Orders.Add(new Orders { OrderId = 1, UserId = 1, OrderDate = DateTime.UtcNow, Status = "Pending", TotalAmount = 500 });
        await ctx.SaveChangesAsync();

        var repo = NewRepo(ctx);
        await repo.CreatePaymentAsync(new Payment { OrderId = 1, PaymentMethod = "Card", PaymentStatus = "Pending" });

        var order = await ctx.Orders.FindAsync(1);
        var invoice = await ctx.Invoices.FirstOrDefaultAsync(i => i.OrderId == 1);

        Assert.Equal("Processing", order!.Status);
        Assert.NotNull(invoice);
        Assert.Equal("Issued", invoice!.Status);
        Assert.Equal(500, invoice.TotalAmount);
    }

    [Fact]
    public async Task CreatePayment_SecondPaymentForSameOrder_Throws()
    {
        using var ctx = NewContext();
        ctx.Orders.Add(new Orders { OrderId = 2, UserId = 1, OrderDate = DateTime.UtcNow, Status = "Pending", TotalAmount = 100 });
        await ctx.SaveChangesAsync();
        var repo = NewRepo(ctx);

        await repo.CreatePaymentAsync(new Payment { OrderId = 2, PaymentMethod = "Cash", PaymentStatus = "Pending" });

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            repo.CreatePaymentAsync(new Payment { OrderId = 2, PaymentMethod = "UPI", PaymentStatus = "Pending" }));
    }

    [Fact]
    public async Task MarkCompleted_CompletesOrder_PaysInvoice_AndCreatesReceipt()
    {
        using var ctx = NewContext();
        ctx.Orders.Add(new Orders { OrderId = 3, UserId = 1, OrderDate = DateTime.UtcNow, Status = "Pending", TotalAmount = 750 });
        await ctx.SaveChangesAsync();
        var repo = NewRepo(ctx);
        var payment = await repo.CreatePaymentAsync(new Payment { OrderId = 3, PaymentMethod = "Card", PaymentStatus = "Pending" });

        await repo.UpdatePaymentStatusAsync(payment.PaymentId, "Completed");

        var order   = await ctx.Orders.FindAsync(3);
        var invoice = await ctx.Invoices.FirstOrDefaultAsync(i => i.OrderId == 3);
        var receipt = await ctx.Receipts.FirstOrDefaultAsync(r => r.PaymentId == payment.PaymentId);

        Assert.Equal("Completed", order!.Status);
        Assert.Equal("Paid", invoice!.Status);
        Assert.NotNull(receipt);
        Assert.Equal(750, receipt!.AmountPaid);
    }

    [Fact]
    public async Task UpdatePaymentStatus_InvalidStatus_Throws()
    {
        using var ctx = NewContext();
        ctx.Orders.Add(new Orders { OrderId = 4, UserId = 1, OrderDate = DateTime.UtcNow, Status = "Pending", TotalAmount = 10 });
        await ctx.SaveChangesAsync();
        var repo = NewRepo(ctx);
        var payment = await repo.CreatePaymentAsync(new Payment { OrderId = 4, PaymentMethod = "Cash", PaymentStatus = "Pending" });

        await Assert.ThrowsAsync<ArgumentException>(() =>
            repo.UpdatePaymentStatusAsync(payment.PaymentId, "Bogus"));
    }
}
