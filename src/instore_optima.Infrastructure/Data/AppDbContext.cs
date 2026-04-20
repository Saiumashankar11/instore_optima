using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Microsoft.EntityFrameworkCore;
using instore_optima.Domain.Entities;

namespace instore_optima.Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // ?? DbSets (Tables)

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

        // ?? RELATIONSHIP CONFIGURATION

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ?? PRIMARY KEYS
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
            modelBuilder.Entity<AuditLog>()
                .Property(a => a.OldValues)
                .HasColumnType("nvarchar(max)");

            modelBuilder.Entity<AuditLog>()
                .Property(a => a.NewValues)
                .HasColumnType("nvarchar(max)");

            // ?? USER
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            // ?? FOREIGN KEY CONFIGURATIONS - Navigation properties removed from entities
            // Database relationships maintained via FK columns in the tables

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
                .WithMany()
                .HasForeignKey(oi => oi.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            // Order_Items.ProductId ? Products.ProductId
            modelBuilder.Entity<Order_Items>()
                .HasOne<Products>()
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
                .OnDelete(DeleteBehavior.Restrict);

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
        }
    }
}
