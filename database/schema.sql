-- ============================================
-- DATABASE: INVENTORY MANAGEMENT SYSTEM v3.0
-- Core tables with refined relationships
-- ============================================

CREATE DATABASE Inventory_system;

USE Inventory_system;

-- ============================================
-- 1. Users Table
-- ============================================
CREATE TABLE [User] (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

-- ============================================
-- 2. Suppliers Table
-- ============================================
CREATE TABLE Supplier (
    supplier_id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact VARCHAR(15),
    email VARCHAR(100),
    address TEXT
);

-- ============================================
-- 3. Products Table
-- ============================================
CREATE TABLE Products (
    product_id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(18,2) NOT NULL,
    min_stock INT NOT NULL,
    max_stock INT NOT NULL,
    supplier_id INT NOT NULL,

    CONSTRAINT FK_Products_Suppliers FOREIGN KEY (supplier_id) 
        REFERENCES Supplier(supplier_id) ON DELETE NO ACTION
);

CREATE INDEX IX_Products_SupplierId ON Products(supplier_id);

-- ============================================
-- 4. Stock Table (1:1 with Products)
-- ============================================
CREATE TABLE Stock (
    stock_id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT UNIQUE NOT NULL,
    current_stock INT NOT NULL DEFAULT 0,
    last_updated DATETIME DEFAULT GETDATE(),

    CONSTRAINT FK_Stock_Products FOREIGN KEY (product_id) 
        REFERENCES Products(product_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IX_Stock_ProductId ON Stock(product_id);

-- ============================================
-- 5. Orders Table
-- ============================================
CREATE TABLE Orders (
    order_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    order_date DATETIME DEFAULT GETDATE(),
    status VARCHAR(50) NOT NULL,
    total_amount DECIMAL(18,2) NULL,  -- ✅ NEW: Denormalized for performance

    CONSTRAINT FK_Orders_Users FOREIGN KEY (user_id) 
        REFERENCES [User](user_id) ON DELETE NO ACTION
);

CREATE INDEX IX_Orders_UserId ON Orders(user_id);

-- ============================================
-- 6. Order_Items Table (Line Items)
-- ============================================
CREATE TABLE Order_Items (
    order_item_id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(18,2) NOT NULL,

    CONSTRAINT FK_OrderItems_Orders FOREIGN KEY (order_id) 
        REFERENCES Orders(order_id) ON DELETE CASCADE,
    CONSTRAINT FK_OrderItems_Products FOREIGN KEY (product_id) 
        REFERENCES Products(product_id) ON DELETE NO ACTION
);

CREATE INDEX IX_OrderItems_OrderId ON Order_Items(order_id);
CREATE INDEX IX_OrderItems_ProductId ON Order_Items(product_id);

-- ============================================
-- 7. Payment Table
-- ============================================
CREATE TABLE Payment (
    payment_id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT UNIQUE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50) NOT NULL,
    payment_date DATETIME DEFAULT GETDATE(),
    -- ❌ REMOVED: price DECIMAL(18,2) - Get from Invoice.TotalAmount instead

    CONSTRAINT FK_Payments_Orders FOREIGN KEY (order_id) 
        REFERENCES Orders(order_id) ON DELETE NO ACTION
);

CREATE UNIQUE INDEX IX_Payments_OrderId ON Payment(order_id);