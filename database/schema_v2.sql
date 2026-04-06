-- ============================================
-- DATABASE V2: ADDITIONAL TABLES
-- Run AFTER schema.sql
-- ============================================
use Inventory_system;

-- 1. StockMovement
CREATE TABLE StockMovement (
    movement_id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    movement_type VARCHAR(10) CHECK (movement_type IN ('IN', 'OUT')),
    performed_by INT,
    performed_at DATETIME DEFAULT GETDATE(),
    reason VARCHAR(255),

    FOREIGN KEY (product_id) REFERENCES Products(product_id),
    FOREIGN KEY (performed_by) REFERENCES [User](user_id)
);


-- 2. ReplenishmentRule
CREATE TABLE ReplenishmentRule (
    rule_id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT NOT NULL,
    min_level INT,
    max_level INT,
    reorder_point INT,
    created_at DATETIME DEFAULT GETDATE(),
    status VARCHAR(50),

    FOREIGN KEY (product_id) REFERENCES Products(product_id)
);


-- 3. ReplenishmentOrder
CREATE TABLE ReplenishmentOrder (
    replenishment_order_id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT NOT NULL,
    quantity_requested INT NOT NULL,
    generated_at DATETIME DEFAULT GETDATE(),
    approved_by INT,
    approved_at DATETIME,
    status VARCHAR(50),

    FOREIGN KEY (product_id) REFERENCES Products(product_id),
    FOREIGN KEY (approved_by) REFERENCES [User](user_id)
);


-- 4. PurchaseOrder
CREATE TABLE PurchaseOrder (
    po_id INT IDENTITY(1,1) PRIMARY KEY,
    replenishment_order_id INT NOT NULL,
    supplier_id INT NOT NULL,
    issued_at DATETIME DEFAULT GETDATE(),
    expected_delivery_date DATETIME,
    status VARCHAR(50),

    FOREIGN KEY (replenishment_order_id) REFERENCES ReplenishmentOrder(replenishment_order_id),
    FOREIGN KEY (supplier_id) REFERENCES Supplier(supplier_id)
);


-- 5. Invoice
CREATE TABLE Invoice (
    invoice_id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT NOT NULL,
    invoice_number VARCHAR(50) UNIQUE,
    total_amount DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    issued_date DATETIME DEFAULT GETDATE(),
    due_date DATETIME,
    status VARCHAR(50),

    FOREIGN KEY (order_id) REFERENCES Orders(order_id)
);


-- 6. Receipt
CREATE TABLE Receipt (
    receipt_id INT IDENTITY(1,1) PRIMARY KEY,
    payment_id INT NOT NULL,
    receipt_number VARCHAR(50) UNIQUE,
    amount_paid DECIMAL(10,2),
    payment_date DATETIME,
    generated_at DATETIME DEFAULT GETDATE(),

    FOREIGN KEY (payment_id) REFERENCES Payment(payment_id)
);


-- 7. AuditLog
CREATE TABLE AuditLog (
    audit_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT,
    action VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id INT,
    description VARCHAR(255),
    created_at DATETIME DEFAULT GETDATE(),

    FOREIGN KEY (user_id) REFERENCES [User](user_id)
);


-- 8. Notification
CREATE TABLE Notification (
    notification_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT,
    message VARCHAR(255),
    type VARCHAR(50),
    status VARCHAR(50),
    created_at DATETIME DEFAULT GETDATE(),

    FOREIGN KEY (user_id) REFERENCES [User](user_id)
);


-- 9. Task
CREATE TABLE Task (
    task_id INT IDENTITY(1,1) PRIMARY KEY,
    assigned_to INT,
    related_entity VARCHAR(50),
    description VARCHAR(255),
    due_date DATETIME,
    priority VARCHAR(20),
    status VARCHAR(50),
    created_at DATETIME DEFAULT GETDATE(),

    FOREIGN KEY (assigned_to) REFERENCES [User](user_id)
);


