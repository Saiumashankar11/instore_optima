-- ============================================
-- DATABASE V2: ADDITIONAL TABLES (v3.0 REFINED)
-- Run AFTER schema.sql
-- ============================================

USE Inventory_system;

-- Invoice Table
CREATE TABLE Invoice (
    invoice_id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT UNIQUE NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    total_amount DECIMAL(18,2) NOT NULL,
    tax_amount DECIMAL(18,2) NOT NULL,
    issued_date DATETIME DEFAULT GETDATE(),
    due_date DATETIME,
    status VARCHAR(50) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE NO ACTION
);

CREATE UNIQUE INDEX IX_Invoices_OrderId ON Invoice(order_id);

-- Receipt Table
CREATE TABLE Receipt (
    receipt_id INT IDENTITY(1,1) PRIMARY KEY,
    payment_id INT UNIQUE NOT NULL,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    amount_paid DECIMAL(18,2) NOT NULL,
    payment_date DATETIME,
    generated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (payment_id) REFERENCES Payment(payment_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IX_Receipts_PaymentId ON Receipt(payment_id);

-- StockMovement Table
CREATE TABLE StockMovement (
    movement_id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    movement_type VARCHAR(50) NOT NULL,
    performed_by INT NOT NULL,
    performed_at DATETIME DEFAULT GETDATE(),
    reason VARCHAR(255),
    FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES [User](user_id) ON DELETE NO ACTION
);

CREATE INDEX IX_StockMovements_ProductId ON StockMovement(product_id);
CREATE INDEX IX_StockMovements_PerformedBy ON StockMovement(performed_by);

-- ReplenishmentRule Table
CREATE TABLE ReplenishmentRule (
    rule_id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT NOT NULL,
    min_level INT NOT NULL,
    max_level INT NOT NULL,
    reorder_point INT NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    status VARCHAR(50) NOT NULL,
    FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE
);

CREATE INDEX IX_ReplenishmentRules_ProductId ON ReplenishmentRule(product_id);

-- ReplenishmentOrder Table
CREATE TABLE ReplenishmentOrder (
    replenishment_order_id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT NOT NULL,
    quantity_requested INT NOT NULL,
    generated_at DATETIME DEFAULT GETDATE(),
    approved_by INT NOT NULL,
    approved_at DATETIME,
    status VARCHAR(50) NOT NULL,
    FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES [User](user_id) ON DELETE NO ACTION
);

CREATE INDEX IX_ReplenishmentOrders_ProductId ON ReplenishmentOrder(product_id);
CREATE INDEX IX_ReplenishmentOrders_ApprovedBy ON ReplenishmentOrder(approved_by);

-- PurchaseOrder Table
CREATE TABLE PurchaseOrder (
    purchase_order_id INT IDENTITY(1,1) PRIMARY KEY,
    replenishment_order_id INT UNIQUE NOT NULL,
    supplier_id INT NOT NULL,
    issued_at DATETIME DEFAULT GETDATE(),
    expected_delivery_date DATETIME,
    status VARCHAR(50) NOT NULL,
    FOREIGN KEY (replenishment_order_id) REFERENCES ReplenishmentOrder(replenishment_order_id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES Supplier(supplier_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IX_PurchaseOrders_ReplenishmentOrderId ON PurchaseOrder(replenishment_order_id);
CREATE INDEX IX_PurchaseOrders_SupplierId ON PurchaseOrder(supplier_id);

-- Replenishment_Log Table
CREATE TABLE Replenishment_Log (
    log_id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT NOT NULL,
    supplier_id INT NOT NULL,
    purchase_order_id INT NOT NULL,
    current_stock INT NOT NULL,
    suggested_quantity INT NOT NULL,
    quantity_added INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    datetime DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE NO ACTION,
    FOREIGN KEY (supplier_id) REFERENCES Supplier(supplier_id) ON DELETE NO ACTION,
    FOREIGN KEY (purchase_order_id) REFERENCES PurchaseOrder(purchase_order_id) ON DELETE CASCADE
);

CREATE INDEX IX_ReplenishmentLogs_ProductId ON Replenishment_Log(product_id);
CREATE INDEX IX_ReplenishmentLogs_SupplierId ON Replenishment_Log(supplier_id);
CREATE INDEX IX_ReplenishmentLogs_PurchaseOrderId ON Replenishment_Log(purchase_order_id);

-- AuditLog Table
CREATE TABLE AuditLog (
    audit_log_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    description VARCHAR(255),
    old_values NVARCHAR(MAX),
    new_values NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES [User](user_id) ON DELETE NO ACTION
);

CREATE INDEX IX_AuditLogs_UserId ON AuditLog(user_id);

-- Notification Table
CREATE TABLE Notification (
    notification_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    message VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    is_read BIT DEFAULT 0,
    read_at DATETIME NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES [User](user_id) ON DELETE CASCADE
);

CREATE INDEX IX_Notifications_UserId ON Notification(user_id);

-- TaskItem Table
CREATE TABLE TaskItem (
    task_item_id INT IDENTITY(1,1) PRIMARY KEY,
    assigned_to INT NOT NULL,
    related_entity VARCHAR(50),
    description VARCHAR(255) NOT NULL,
    due_date DATETIME,
    priority VARCHAR(20),
    status VARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (assigned_to) REFERENCES [User](user_id) ON DELETE NO ACTION
);

CREATE INDEX IX_TaskItems_AssignedTo ON TaskItem(assigned_to);
