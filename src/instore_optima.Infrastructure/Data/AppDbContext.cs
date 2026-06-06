// =============================================================================
// AppDbContext.cs — Entity Framework Core database context
// =============================================================================
// AppDbContext is the main gateway between the application and the SQL Server
// database. It:
//   • Declares a DbSet<T> property for every table — EF uses these to generate
//     SQL queries and track in-memory changes.
//   • Overrides OnModelCreating() to define primary keys, decimal precision,
//     unique indexes, and foreign-key relationships using the Fluent API
//     (instead of data annotations on the entity classes).
// =============================================================================
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Microsoft.EntityFrameworkCore;
using instore_optima.Domain.Entities;

namespace instore_optima.Infrastructure.Data
{
    /// <summary>
    /// EF Core DbContext for InStore Optima. Pass a <see cref="DbContextOptions{AppDbContext}"/>
    /// (configured in Program.cs) so the context knows which database to target.
    /// </summary>
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // ?? DbSets (Tables)
        // Each DbSet<T> represents one database table. EF Core uses these to
        // translate LINQ queries (e.g. ctx.Users.Where(...)) into SQL statements.

        public DbSet<User> Users { get; set; }
        public DbSet<Supplier> Suppliers { get; set; }
        public DbSet<Products> Products { get; set; }
        public DbSet<Stock> Stocks { get; set; }
        public DbSet<Orders> Orders { get; set; }
        public DbSet<Order_Items> OrderItems { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<Invoice> Invoices { get; set; }
        public DbSet<Receipt> Receipts { get; set; }
        public DbSet<Replenishment_Log> ReplenishmentLogs { get; set; }
        public DbSet<StockMovement> StockMovements { get; set; }
        public DbSet<ReplenishmentRule> ReplenishmentRules { get; set; }
        public DbSet<ReplenishmentOrder> ReplenishmentOrders { get; set; }
        public DbSet<PurchaseOrder> PurchaseOrders { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<TaskItem> Tasks { get; set; }
        public DbSet<InternalMessage> InternalMessages { get; set; }
        public DbSet<UserOtp> UserOtps { get; set; }

        // ?? RELATIONSHIP CONFIGURATION
        // OnModelCreating is called once when EF Core first creates the model.
        // We use the Fluent API here (rather than attributes on entity classes)
        // to keep domain entities free of infrastructure concerns.

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Always call the base implementation first so EF Core can apply
            // its own default conventions before we override specific things.
            base.OnModelCreating(modelBuilder);

            // ?? PRIMARY KEYS
            // Explicitly declare the primary key column for each table.
            // This is optional when the property is named "Id" or "<Entity>Id",
            // but being explicit makes the intent clear and prevents surprises.
            modelBuilder.Entity<User>().HasKey(u => u.UserId);
            modelBuilder.Entity<Supplier>().HasKey(s => s.SupplierId);
            modelBuilder.Entity<Products>().HasKey(p => p.ProductId);
            modelBuilder.Entity<Stock>().HasKey(s => s.StockId);
            modelBuilder.Entity<Orders>().HasKey(o => o.OrderId);
            modelBuilder.Entity<Order_Items>().HasKey(oi => oi.OrderItemId);
            modelBuilder.Entity<Payment>().HasKey(p => p.PaymentId);
            modelBuilder.Entity<Invoice>().HasKey(i => i.InvoiceId);
            modelBuilder.Entity<Receipt>().HasKey(r => r.ReceiptId);
            modelBuilder.Entity<Replenishment_Log>().HasKey(l => l.LogId);
            modelBuilder.Entity<StockMovement>().HasKey(sm => sm.MovementId);
            modelBuilder.Entity<ReplenishmentRule>().HasKey(r => r.RuleId);
            modelBuilder.Entity<ReplenishmentOrder>().HasKey(ro => ro.ReplenishmentOrderId);
            modelBuilder.Entity<PurchaseOrder>().HasKey(po => po.PurchaseOrderId);
            modelBuilder.Entity<AuditLog>().HasKey(a => a.AuditLogId);
            modelBuilder.Entity<Notification>().HasKey(n => n.NotificationId);
            modelBuilder.Entity<TaskItem>().HasKey(t => t.TaskItemId);

            // ?? DECIMAL PRECISION (for currency/financial fields)
            // SQL Server's default decimal mapping may lose precision. We pin every
            // money column to (18, 2): up to 18 digits total, 2 after the decimal
            // point — the standard for currency values.
            modelBuilder.Entity<Products>()
                .Property(p => p.Price)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Orders>()
                .Property(o => o.TotalAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Order_Items>()
                .Property(oi => oi.Price)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Invoice>()
                .Property(i => i.TotalAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Invoice>()
                .Property(i => i.TaxAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Receipt>()
                .Property(r => r.AmountPaid)
                .HasPrecision(18, 2);

            // ?? AUDIT LOG - Store change history
            // OldValues/NewValues hold JSON snapshots of changed properties and can
            // be very long, so we use nvarchar(max) instead of a fixed-length column.
            modelBuilder.Entity<AuditLog>()
                .Property(a => a.OldValues)
                .HasColumnType("nvarchar(max)");

            modelBuilder.Entity<AuditLog>()
                .Property(a => a.NewValues)
                .HasColumnType("nvarchar(max)");

            // ?? USER
            // Enforce email uniqueness at the database level so duplicate accounts
            // are rejected even if the application layer somehow misses the check.
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            // ?? FOREIGN KEY CONFIGURATIONS - Navigation properties removed from entities
            // Database relationships maintained via FK columns in the tables
            //
            // Each block below declares a relationship with three pieces of info:
            //   HasOne / HasMany   — "this entity has one/many of that entity"
            //   WithMany / WithOne — "the other side has many/one back"
            //   HasForeignKey      — "this column in the table is the FK"
            //   OnDelete           — what happens to child rows when the parent is deleted:
            //      Restrict = block the delete (prevents accidental data loss)
            //      Cascade  = delete children automatically

            // Products.SupplierId ? Suppliers.SupplierId
            modelBuilder.Entity<Products>()
                .HasOne<Supplier>()
                .WithMany()
                .HasForeignKey(p => p.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);

            // Stock.ProductId ? Products.ProductId
            modelBuilder.Entity<Stock>()
                .HasOne<Products>()
                .WithOne()
                .HasForeignKey<Stock>(s => s.ProductId);

            // Orders.UserId ? Users.UserId
            modelBuilder.Entity<Orders>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(o => o.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Order_Items.OrderId ? Orders.OrderId
            modelBuilder.Entity<Order_Items>()
                .HasOne<Orders>()
                .WithMany(o => o.OrderItems)
                .HasForeignKey(oi => oi.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            // Order_Items.ProductId ? Products.ProductId
            modelBuilder.Entity<Order_Items>()
                .HasOne(oi => oi.Product)
                .WithMany()
                .HasForeignKey(oi => oi.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            // Payment.OrderId ? Orders.OrderId
            modelBuilder.Entity<Payment>()
                .HasOne<Orders>()
                .WithOne()
                .HasForeignKey<Payment>(p => p.OrderId)
                .OnDelete(DeleteBehavior.Restrict);

            // Invoice.OrderId ? Orders.OrderId
            modelBuilder.Entity<Invoice>()
                .HasOne<Orders>()
                .WithOne()
                .HasForeignKey<Invoice>(i => i.OrderId)
                .OnDelete(DeleteBehavior.Restrict);

            // Receipt.PaymentId ? Payment.PaymentId
            modelBuilder.Entity<Receipt>()
                .HasOne<Payment>()
                .WithOne()
                .HasForeignKey<Receipt>(r => r.PaymentId)
                .OnDelete(DeleteBehavior.Cascade);

            // StockMovement.ProductId ? Products.ProductId
            modelBuilder.Entity<StockMovement>()
                .HasOne<Products>()
                .WithMany()
                .HasForeignKey(sm => sm.ProductId);

            // StockMovement.PerformedBy ? Users.UserId
            modelBuilder.Entity<StockMovement>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(sm => sm.PerformedBy)
                .OnDelete(DeleteBehavior.Restrict);

            // ReplenishmentRule.ProductId ? Products.ProductId
            modelBuilder.Entity<ReplenishmentRule>()
                .HasOne<Products>()
                .WithMany()
                .HasForeignKey(r => r.ProductId);

            // ReplenishmentOrder.ProductId ? Products.ProductId
            modelBuilder.Entity<ReplenishmentOrder>()
                .HasOne<Products>()
                .WithMany()
                .HasForeignKey(ro => ro.ProductId);

            // ReplenishmentOrder.ApprovedBy ? Users.UserId
            modelBuilder.Entity<ReplenishmentOrder>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(ro => ro.ApprovedBy)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired(false);

            // PurchaseOrder.SupplierId ? Suppliers.SupplierId
            modelBuilder.Entity<PurchaseOrder>()
                .HasOne<Supplier>()
                .WithMany()
                .HasForeignKey(po => po.SupplierId);

            // PurchaseOrder.ReplenishmentOrderId ? ReplenishmentOrder.ReplenishmentOrderId
            modelBuilder.Entity<PurchaseOrder>()
                .HasOne<ReplenishmentOrder>()
                .WithOne()
                .HasForeignKey<PurchaseOrder>(po => po.ReplenishmentOrderId);

            // Replenishment_Log.PurchaseOrderId ? PurchaseOrder.PurchaseOrderId
            modelBuilder.Entity<Replenishment_Log>()
                .HasOne<PurchaseOrder>()
                .WithMany()
                .HasForeignKey(rl => rl.PurchaseOrderId);

            // Replenishment_Log.ProductId ? Products.ProductId
            modelBuilder.Entity<Replenishment_Log>()
                .HasOne<Products>()
                .WithMany()
                .HasForeignKey(rl => rl.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            // Replenishment_Log.SupplierId ? Suppliers.SupplierId
            modelBuilder.Entity<Replenishment_Log>()
                .HasOne<Supplier>()
                .WithMany()
                .HasForeignKey(rl => rl.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);

            // AuditLog.UserId ? Users.UserId
            modelBuilder.Entity<AuditLog>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(a => a.UserId);

            // Notification.UserId ? Users.UserId
            modelBuilder.Entity<Notification>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(n => n.UserId);

            // TaskItem.AssignedTo ? Users.UserId
            modelBuilder.Entity<TaskItem>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(t => t.AssignedTo)
                .OnDelete(DeleteBehavior.Restrict);

            // UserOtp — used for multi-factor authentication (TOTP / email OTP).
            // SessionKey must be unique so each OTP session can be looked up quickly.
            // Cascade delete means OTPs are cleaned up automatically if the user is removed.
            modelBuilder.Entity<UserOtp>().HasKey(o => o.Id);
            modelBuilder.Entity<UserOtp>()
                .HasIndex(o => o.SessionKey)
                .IsUnique();
            modelBuilder.Entity<UserOtp>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(o => o.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // InternalMessage — in-app messaging between users.
            // Both SenderId and ReceiverId are FKs to the Users table. Restrict
            // prevents deleting a user who still has messages in the system.
            modelBuilder.Entity<InternalMessage>().HasKey(m => m.MessageId);

            modelBuilder.Entity<InternalMessage>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<InternalMessage>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(m => m.ReceiverId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
