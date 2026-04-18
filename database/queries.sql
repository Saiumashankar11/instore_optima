create database Inventory_system;
 
use Inventory_system;
 
--1.View Orders with User
 
SELECT o.order_id, u.name, o.status
FROM Orders o
JOIN [User] u ON o.user_id = u.user_id;
 
--2. Order Details (MOST IMPORTANT)
 
SELECT o.order_id, p.name, oi.quantity, oi.price
FROM Order_Items oi
JOIN Orders o ON oi.order_id = o.order_id
JOIN Products p ON oi.product_id = p.product_id;
 
 
-- 3. Low Stock Products
 
SELECT p.name, s.current_stock, p.min_stock
FROM Products p
JOIN Stock s ON p.product_id = s.product_id
WHERE s.current_stock < p.min_stock;
 
--4. Total Revenue
 
SELECT SUM(price) AS Total_Revenue
FROM Payment
WHERE payment_status = 'Success';
 
--5. Supplier Products
 
SELECT s.name AS Supplier, p.name AS Product
FROM Supplier s
JOIN Products p ON s.supplier_id = p.supplier_id;
 
 
-- QA
 
INSERT INTO Orders (user_id, status)
VALUES (999, 'Pending');
 
 
INSERT INTO Order_Items (order_id, product_id, quantity, price)
VALUES (1, 999, 2, 100);
 
 
INSERT INTO Payment (order_id, price, payment_method, payment_status)
VALUES (1, 500, 'Card', 'Success');
 
 
INSERT INTO Stock (product_id, current_stock)
VALUES (999, 10);
 
INSERT INTO Stock (product_id, current_stock)
VALUES (1, 30);   