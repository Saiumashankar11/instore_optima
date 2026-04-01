create database Inventory_system;
 
use Inventory_system;

 
-- users
 
INSERT INTO [User] (name, email, password, role)
VALUES 
('Admin', 'admin@test.com', '123', 'admin'),
('John', 'john@test.com', '123', 'customer');
 
-- supplier
 
INSERT INTO Supplier (name, contact, email, address)
VALUES 
('ABC Supplier', '9876543210', 'abc@test.com', 'Hyderabad'),
('XYZ Supplier', '9123456780', 'xyz@test.com', 'Chennai');
 
 
--Products
 
 
INSERT INTO Products (name, description, price, min_stock, max_stock, supplier_id)
VALUES
('Laptop', 'Gaming laptop', 70000, 5, 50, 1),
('Mouse', 'Wireless mouse', 500, 10, 100, 2);
 
 
--Stock
 
INSERT INTO Stock (product_id, current_stock)
VALUES
(1, 20),
(2, 50);
 
--Orders
 
INSERT INTO Orders (user_id, status)
VALUES
(2, 'Completed'),
(2, 'Pending');
 
 
--Order items
 
INSERT INTO Order_Items (order_id, product_id, quantity, price)
VALUES
(1, 1, 1, 70000),
(1, 2, 2, 500),
(2, 2, 1, 500);
 
 
--Payment
 
 
INSERT INTO Payment (order_id, price, payment_method, payment_status)
VALUES
(1, 71000, 'UPI', 'Success');
 
 
--Replenishment
 
 
INSERT INTO Replenishment_Log 
(product_id, product_name, supplier_id, current_stock, suggested_quantity, quantity_added, status)
VALUES
(1, 'Laptop', 1, 5, 20, 15, 'Completed');
 
 