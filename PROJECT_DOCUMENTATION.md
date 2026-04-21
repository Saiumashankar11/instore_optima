# InStore Optima - Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Database Models](#database-models)
6. [API Controllers](#api-controllers)
7. [Entity Relationships](#entity-relationships)
8. [Workflow Diagrams](#workflow-diagrams)
9. [API Endpoints](#api-endpoints)

---

## Project Overview

**InStore Optima** is a comprehensive **Inventory and Order Management System** designed for retail stores. The application manages products, stock levels, orders, suppliers, payments, invoices, and automated replenishment workflows.

### Key Features
- **Product Management**: Create, update, and manage product inventory
- **Stock Management**: Track current stock levels with min/max thresholds
- **Order Processing**: Handle customer orders and order items
- **Automated Replenishment**: Automatic stock replenishment based on rules
- **Payment & Invoicing**: Process payments and generate invoices
- **Supplier Management**: Manage supplier information and relationships
- **Audit Logging**: Track all system changes with detailed audit logs
- **Task Management**: Assign and track operational tasks
- **Notifications**: System notifications for important events

---

## Architecture

The project follows a **layered architecture** pattern with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│     instore_optima.Api                  │
│  (Controllers, API Endpoints, Program)  │
└─────────┬───────────────────────────────┘
          │
┌─────────▼───────────────────────────────┐
│   instore_optima.Application            │
│  (Business Logic, Services)             │
└─────────┬───────────────────────────────┘
          │
┌─────────▼───────────────────────────────┐
│   instore_optima.Domain                 │
│  (Entity Models, Business Rules)        │
└─────────┬───────────────────────────────┘
          │
┌─────────▼───────────────────────────────┐
│   instore_optima.Infrastructure         │
│  (DbContext, Data Access, Migrations)   │
└─────────────────────────────────────────┘
```

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Framework | .NET 8.0 |
| Language | C# |
| Database | SQL Server |
| ORM | Entity Framework Core |
| Web API | ASP.NET Core |
| Migrations | EF Core Migrations |

---

## Project Structure

```
instore_optima/
├── src/
│   ├── instore_optima.Api/
│   │   ├── Controllers/              (API Endpoints)
│   │   ├── Migrations/               (Database Migrations)
│   │   └── Program.cs               (Application Entry Point)
│   │
│   ├── instore_optima.Application/
│   │   └── (Business Logic Layer - Future Services)
│   │
│   ├── instore_optima.Domain/
│   │   └── Entities/                (Database Models)
│   │
│   └── instore_optima.Infrastructure/
│       └── Data/                     (DbContext & Data Access)
│
└── README.md
```

---

## Database Models

### 1. **User**
Represents system users with authentication and role-based access.

| Property | Type | Notes |
|----------|------|-------|
| UserId | int | Primary Key |
| Name | string | User full name |
| Email | string | Unique email address |
| Password | string | Encrypted password |
| Role | string | User role (Admin, Manager, Staff) |
| CreatedAt | DateTime | Account creation timestamp |

---

### 2. **Supplier**
Manages supplier information and contact details.

| Property | Type | Notes |
|----------|------|-------|
| SupplierId | int | Primary Key |
| Name | string | Supplier company name |
| Contact | string | Contact person name |
| Email | string | Supplier email |
| Address | string | Supplier physical address |

---

### 3. **Products**
Represents individual products in the inventory.

| Property | Type | Notes |
|----------|------|-------|
| ProductId | int | Primary Key |
| Name | string | Product name |
| Description | string | Product description |
| Price | decimal(18,2) | Product price |
| MinStock | int | Minimum stock level threshold |
| MaxStock | int | Maximum stock level threshold |
| SupplierId | int | Foreign Key to Supplier |

---

### 4. **Stock**
Tracks current inventory levels for each product.

| Property | Type | Notes |
|----------|------|-------|
| StockId | int | Primary Key |
| ProductId | int | Foreign Key to Products |
| CurrentStock | int | Current quantity in stock |
| LastUpdated | DateTime | Last update timestamp |

---

### 5. **Orders**
Represents customer orders placed in the system.

| Property | Type | Notes |
|----------|------|-------|
| OrderId | int | Primary Key |
| UserId | int | Foreign Key to User |
| OrderDate | DateTime | Order creation date |
| Status | string | Order status (Pending, Processing, Completed, Cancelled) |
| TotalAmount | decimal(18,2) | Order total amount |

---

### 6. **Order_Items**
Line items within an order (junction table for order details).

| Property | Type | Notes |
|----------|------|-------|
| OrderItemId | int | Primary Key |
| OrderId | int | Foreign Key to Orders |
| ProductId | int | Foreign Key to Products |
| Quantity | int | Item quantity |
| Price | decimal(18,2) | Item unit price |

---

### 7. **Payment**
Records payment transactions for orders.

| Property | Type | Notes |
|----------|------|-------|
| PaymentId | int | Primary Key |
| OrderId | int | Foreign Key to Orders |
| PaymentMethod | string | Method (Card, Cash, Bank Transfer, etc.) |
| PaymentStatus | string | Status (Pending, Completed, Failed, Refunded) |
| PaymentDate | DateTime | Payment date/time |

---

### 8. **Invoice**
Financial invoices generated from orders.

| Property | Type | Notes |
|----------|------|-------|
| InvoiceId | int | Primary Key |
| OrderId | int | Foreign Key to Orders |
| InvoiceNumber | string | Unique invoice reference number |
| TotalAmount | decimal(18,2) | Total invoice amount |
| TaxAmount | decimal(18,2) | Tax amount |
| IssuedDate | DateTime | Invoice issue date |
| DueDate | DateTime | Payment due date |
| Status | string | Status (Draft, Issued, Paid, Overdue) |

---

### 9. **Receipt**
Receipts generated after successful payment.

| Property | Type | Notes |
|----------|------|-------|
| ReceiptId | int | Primary Key |
| PaymentId | int | Foreign Key to Payment |
| ReceiptNumber | string | Unique receipt reference number |
| AmountPaid | decimal(18,2) | Amount paid |
| PaymentDate | DateTime | Payment date |
| GeneratedAt | DateTime | Receipt generation timestamp |

---

### 10. **ReplenishmentRule**
Rules that define when and how products should be replenished.

| Property | Type | Notes |
|----------|------|-------|
| RuleId | int | Primary Key |
| ProductId | int | Foreign Key to Products |
| MinLevel | int | Minimum stock level |
| MaxLevel | int | Maximum stock level |
| ReorderPoint | int | Trigger point for reorder |
| CreatedAt | DateTime | Rule creation date |
| Status | string | Active/Inactive |

---

### 11. **ReplenishmentOrder**
Auto-generated replenishment orders when stock falls below threshold.

| Property | Type | Notes |
|----------|------|-------|
| ReplenishmentOrderId | int | Primary Key |
| ProductId | int | Foreign Key to Products |
| QuantityRequested | int | Quantity to replenish |
| GeneratedAt | DateTime | Auto-generation timestamp |
| ApprovedBy | int | Foreign Key to User (Approver) |
| ApprovedAt | DateTime | Approval timestamp |
| Status | string | Pending, Approved, Rejected |

---

### 12. **PurchaseOrder**
Purchase orders sent to suppliers for replenishment stock.

| Property | Type | Notes |
|----------|------|-------|
| PurchaseOrderId | int | Primary Key |
| ReplenishmentOrderId | int | Foreign Key to ReplenishmentOrder |
| SupplierId | int | Foreign Key to Supplier |
| IssuedAt | DateTime | PO issue date |
| ExpectedDeliveryDate | DateTime | Expected delivery date |
| Status | string | Pending, Delivered, Cancelled |

---

### 13. **StockMovement**
Audit trail of all stock movements (additions, removals, adjustments).

| Property | Type | Notes |
|----------|------|-------|
| MovementId | int | Primary Key |
| ProductId | int | Foreign Key to Products |
| Quantity | int | Movement quantity |
| MovementType | string | Type (IN, OUT, ADJUSTMENT) |
| PerformedBy | int | Foreign Key to User |
| PerformedAt | DateTime | Movement timestamp |
| Reason | string | Reason for movement |

---

### 14. **Replenishment_Log**
Historical log of replenishment activities.

| Property | Type | Notes |
|----------|------|-------|
| LogId | int | Primary Key |
| ProductId | int | Foreign Key to Products |
| SupplierId | int | Foreign Key to Supplier |
| PurchaseOrderId | int | Foreign Key to PurchaseOrder |
| CurrentStock | int | Stock at time of replenishment |
| SuggestedQuantity | int | Suggested replenishment quantity |
| QuantityAdded | int | Actual quantity added |
| Status | string | Completed/Partial/Failed |
| DateTime | DateTime | Log timestamp |

---

### 15. **AuditLog**
Complete audit trail of all system changes for compliance and tracking.

| Property | Type | Notes |
|----------|------|-------|
| AuditLogId | int | Primary Key |
| UserId | int | Foreign Key to User |
| Action | string | Action performed (Create, Update, Delete) |
| EntityType | string | Entity type modified |
| EntityId | int | ID of modified entity |
| Description | string | Change description |
| OldValues | string | Previous values (JSON) |
| NewValues | string | New values (JSON) |
| CreatedAt | DateTime | Audit timestamp |

---

### 16. **Notification**
System notifications for users about important events.

| Property | Type | Notes |
|----------|------|-------|
| NotificationId | int | Primary Key |
| UserId | int | Foreign Key to User |
| Message | string | Notification message |
| Type | string | Type (Alert, Info, Warning, Error) |
| Status | string | Status (Unread, Read) |
| IsRead | bool | Read status flag |
| CreatedAt | DateTime | Creation timestamp |
| ReadAt | DateTime? | Read timestamp (nullable) |

---

### 17. **TaskItem**
Task management for operational tasks and reminders.

| Property | Type | Notes |
|----------|------|-------|
| TaskItemId | int | Primary Key |
| AssignedTo | int | Foreign Key to User |
| RelatedEntity | string | Related entity reference |
| Description | string | Task description |
| DueDate | DateTime | Task due date |
| Priority | string | Priority level (High, Medium, Low) |
| Status | string | Status (Pending, InProgress, Completed) |
| CreatedAt | DateTime | Creation timestamp |

---

## API Controllers

### 1. **UserController**
Manages user accounts and authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user` | Get all users |
| GET | `/api/user/{id}` | Get user by ID |
| POST | `/api/user` | Create new user |
| PUT | `/api/user/{id}` | Update user |
| DELETE | `/api/user/{id}` | Delete user |

---

### 2. **ProductsController**
Manages product catalog and inventory items.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all products |
| POST | `/api/products` | Create new product |
| PUT | `/api/products/{id}` | Update product |
| DELETE | `/api/products/{id}` | Delete product |

---

### 3. **SupplierController**
Manages supplier information and relationships.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/supplier` | Get all suppliers |
| GET | `/api/supplier/{id}` | Get supplier by ID |
| POST | `/api/supplier` | Create new supplier |
| PUT | `/api/supplier/{id}` | Update supplier |
| DELETE | `/api/supplier/{id}` | Delete supplier |

---

### 4. **StockController**
Manages inventory stock levels and tracking.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stock` | Get all stock records |
| POST | `/api/stock` | Create stock record |
| PUT | `/api/stock/{id}` | Update stock |
| DELETE | `/api/stock/{id}` | Delete stock |

---

### 5. **OrdersController**
Manages customer orders and order processing.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | Get all orders |
| GET | `/api/orders/{id}` | Get order by ID |
| POST | `/api/orders` | Create new order |
| PUT | `/api/orders/{id}` | Update order |
| DELETE | `/api/orders/{id}` | Delete order |

---

### 6. **OrderItemsController**
Manages individual line items within orders.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orderitems` | Get all order items |
| GET | `/api/orderitems/{id}` | Get order item by ID |
| POST | `/api/orderitems` | Create order item |
| PUT | `/api/orderitems/{id}` | Update order item |
| DELETE | `/api/orderitems/{id}` | Delete order item |

---

### 7. **PaymentController**
Manages payment processing and transactions.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payment` | Get all payments |
| GET | `/api/payment/{id}` | Get payment by ID |
| POST | `/api/payment` | Create new payment |
| PUT | `/api/payment/{id}` | Update payment |
| DELETE | `/api/payment/{id}` | Delete payment |

---

### 8. **InvoiceController**
Manages invoice generation and tracking.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoice` | Get all invoices |
| GET | `/api/invoice/{id}` | Get invoice by ID |
| POST | `/api/invoice` | Create new invoice |
| PUT | `/api/invoice/{id}` | Update invoice |
| DELETE | `/api/invoice/{id}` | Delete invoice |

---

### 9. **ReceiptController**
Manages receipt generation and payment confirmations.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/receipt` | Get all receipts |
| GET | `/api/receipt/{id}` | Get receipt by ID |
| POST | `/api/receipt` | Create new receipt |
| PUT | `/api/receipt/{id}` | Update receipt |

---

### 10. **StockMovementController**
Tracks all stock movements and adjustments.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stockmovement` | Get all movements |
| GET | `/api/stockmovement/{id}` | Get movement by ID |
| POST | `/api/stockmovement` | Record stock movement |
| PUT | `/api/stockmovement/{id}` | Update movement |

---

### 11. **ReplenishmentController**
Manages automated stock replenishment workflow.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/replenishment` | Get all replenishments |
| GET | `/api/replenishment/{id}` | Get replenishment by ID |
| POST | `/api/replenishment` | Create replenishment order |
| PUT | `/api/replenishment/{id}` | Update replenishment |

---

### 12. **PurchaseOrderController**
Manages purchase orders sent to suppliers.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/purchaseorder` | Get all purchase orders |
| GET | `/api/purchaseorder/{id}` | Get PO by ID |
| POST | `/api/purchaseorder` | Create purchase order |
| PUT | `/api/purchaseorder/{id}` | Update purchase order |

---

## Entity Relationships

### Relationship Diagram

```
User (1) ──── (Many) Orders
User (1) ──── (Many) StockMovement
User (1) ──── (Many) AuditLog
User (1) ──── (Many) Notification
User (1) ──── (Many) TaskItem
User (1) ──── (Many) ReplenishmentOrder (ApprovedBy)

Supplier (1) ──── (Many) Products
Supplier (1) ──── (Many) Replenishment_Log
Supplier (1) ──── (Many) PurchaseOrder

Products (1) ──── (Many) Stock
Products (1) ──── (Many) Order_Items
Products (1) ──── (Many) ReplenishmentRule
Products (1) ──── (Many) ReplenishmentOrder
Products (1) ──── (Many) StockMovement
Products (1) ──── (Many) Replenishment_Log

Orders (1) ──── (Many) Order_Items
Orders (1) ──── (Many) Payment
Orders (1) ──── (Many) Invoice

Order_Items (1) ──── Products

Payment (1) ──── (1) Receipt
Payment (1) ──── Orders

Invoice (1) ──── Orders

Receipt (1) ──── Payment

ReplenishmentOrder (1) ──── (1) PurchaseOrder
ReplenishmentOrder (1) ──── Products

PurchaseOrder (1) ──── (Many) Replenishment_Log
PurchaseOrder (1) ──── Supplier
PurchaseOrder (1) ──── ReplenishmentOrder
```

---

## Workflow Diagrams

### 1. **Order Processing Workflow**

```
┌─────────────────┐
│  Customer Order │
│    Created      │
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│ Validate Order Items │◄──────────────────┐
│ Check Stock Level    │                   │
│ Calculate Total      │                   │
└────────┬─────────────┘                   │
         │                                 │
         ├─ Stock Available ──┐             │
         │                   │             │
         ▼                   ▼             │
    ┌────────┐         ┌─────────┐        │
    │ Pending│         │ Failed  │        │
    └────┬───┘         │ Restock │        │
         │             │ Required├────────┘
         ▼             └─────────┘
   ┌──────────┐
   │Processing│
   └────┬─────┘
        │
        ▼
   ┌──────────────┐
   │ Payment      │
   │ Processing   │
   └────┬─────────┘
        │
        ├─ Success ──┐    ┌─ Failed ──┐
        │            │    │           │
        ▼            ▼    ▼           ▼
   ┌────────┐    ┌────────────┐  ┌─────────┐
   │Completed    │Generate    │  │Payment  │
   │Order        │Invoice     │  │Failed   │
   │+ Stock ▼    │+ Receipt   │  │Notify   │
   │Update       │+ Notification │ User  │
   └────────┘    └────────────┘  └─────────┘
        │
        ▼
   ┌──────────────┐
   │Audit Log     │
   │Entry Created │
   └──────────────┘
```

---

### 2. **Stock Replenishment Workflow**

```
┌─────────────────────────┐
│ Stock Level Monitoring  │
│ (Scheduled Job)         │
└────────┬────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Check Against Replenishment│
│ Rules for Each Product     │
└────────┬───────────────────┘
         │
         ├─ Stock >= ReorderPoint ──┐
         │                          │
         ▼                          ▼
    ┌────────┐            ┌──────────────┐
    │ No     │            │ Stock Below  │
    │Action  │            │ Threshold    │
    └────────┘            │ Replenish    │
                          └────┬─────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Create Replenishment │
                    │ Order                │
                    │ (Auto-generated)     │
                    └────┬─────────────────┘
                         │
                         ▼
                    ┌──────────────────────┐
                    │ Send for Approval    │
                    │ (To Manager)         │
                    └────┬─────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
         ┌────▼──┐             ┌───▼────┐
         │Approved           │Rejected │
         └────┬──┘             └────┬───┘
              │                     │
              ▼                     ▼
      ┌──────────────┐        ┌──────────┐
      │Create Purchase       │ Notified │
      │Order to Supplier     │ & Logged │
      │                      │          │
      │+ Replenishment_Log   └──────────┘
      │  Entry Created
      └────┬─────────┘
           │
           ▼
    ┌─────────────────┐
    │Update Stock Log │
    │+ Notification   │
    │Sent to Users    │
    └─────────────────┘
```

---

### 3. **Payment & Invoice Workflow**

```
┌──────────────────┐
│ Order Completed  │
│ (Ready Payment)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│ Generate Invoice     │
│ • Calculate Total    │
│ • Add Tax            │
│ • Set Due Date       │
└────────┬─────────────┘
         │
         ▼
┌─────────────────────┐
│ Invoice Status:     │
│ Draft → Issued      │
│                     │
│ Send to Customer    │
└────────┬────────────┘
         │
         ▼
┌──────────────────────┐
│ Customer Payment     │
│ Processing           │
│ (Payment Method)     │
└────────┬─────────────┘
         │
         ├─ Success ──┐    ┌─ Failed ──┐
         │            │    │           │
         ▼            ▼    ▼           ▼
    ┌────────┐   ┌──────────────┐  ┌──────────┐
    │Completed   │Generate Receipt  │Retry/   │
    │Payment     │• Receipt No.     │Payment  │
    │Status      │• Amount Paid     │Failed   │
    │            │• Generated Date  │Notif    │
    │            │                  │         │
    │            │+ Notification    └──────────┘
    │            │  (Email/SMS)
    │            │
    │            │Invoice Status:
    │            │Issued → Paid
    └──┬─────────┴────┬─────────┘
       │              │
       ▼              ▼
   ┌────────┐    ┌─────────────┐
   │Audit   │    │Order Complete│
   │Log     │    │Update Status │
   │Entry   │    │              │
   └────────┘    └─────────────┘
```

---

### 4. **User & Authentication Workflow**

```
┌──────────────────────┐
│ User Registration    │
│ (New User)           │
└────────┬─────────────┘
         │
         ▼
┌────────────────────────────┐
│ Validate Input             │
│ • Email uniqueness         │
│ • Password strength        │
└────────┬───────────────────┘
         │
         ├─ Valid ──┐    ┌─ Invalid ──┐
         │          │    │            │
         ▼          ▼    ▼            ▼
    ┌────────┐ ┌──────────────┐  ┌───────────┐
    │ Create │ │Hash Password │  │ Error     │
    │ User   │ │+ Store User  │  │ Response  │
    │ Entity │ │              │  │ Sent      │
    │        │ │Assign Default│  │           │
    └──┬─────┘ │Role          │  └───────────┘
       │       └────┬─────────┘
       │            │
       ▼            ▼
   ┌─────────┐  ┌──────────────┐
   │Save to  │  │Audit Log     │
   │Database │  │Entry Created │
   │         │  │              │
   │+ Notif  │  │Send Activation
   │Sent     │  │Email/SMS     │
   └─────────┘  └──────────────┘
```

---

### 5. **Audit & Compliance Workflow**

```
┌──────────────────────┐
│ Entity Changed       │
│ (Create/Update/Del) │
└────────┬─────────────┘
         │
         ▼
┌────────────────────────────┐
│ Capture Change Details:    │
│ • User Performing Action   │
│ • Action Type              │
│ • Entity Type & ID         │
│ • Old Values (if update)   │
│ • New Values               │
│ • Timestamp                │
└────────┬───────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Create AuditLog Entry       │
│ • Store All Details         │
│ • JSON Format for Values    │
└────────┬────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Save to Database             │
│ (AuditLogs Table)            │
└────────┬─────────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Check for Sensitive Changes│
│ • Price Changes            │
│ • Status Updates           │
│ • Security Changes         │
└────────┬───────────────────┘
         │
         ├─ Sensitive ──┐    ┌─ Normal ──┐
         │              │    │           │
         ▼              ▼    ▼           ▼
    ┌──────────┐   ┌─────────────┐  ┌────────┐
    │Generate  │   │Log Complete │  │Process │
    │Alert &   │   │             │  │Done    │
    │Notif to  │   └─────────────┘  │        │
    │Managers  │                    │        │
    │          │                    │        │
    └──────────┘                    └────────┘
```

---

### 6. **Notification System Workflow**

```
┌──────────────────────────┐
│ System Event Triggered   │
│ • Order Created          │
│ • Stock Low              │
│ • Payment Received       │
│ • Replenishment Ready    │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Identify Target Users    │
│ Based on Event Type &    │
│ Notification Preferences │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Create Notification      │
│ • Message               │
│ • Type (Alert/Info)     │
│ • Priority              │
│ • Related Entity Ref    │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Save to Notifications    │
│ Table (Status: Unread)   │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Send via Channels        │
│ • In-App Notification    │
│ • Email (if enabled)     │
│ • SMS (if enabled)       │
│ • Push Alert             │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ User Receives & Reads    │
│ • Mark as Read           │
│ • Update Status          │
│ • Record Read Time       │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Archive if Old           │
│ (Configurable Days)      │
└──────────────────────────┘
```

---

## API Endpoints Summary

### Base URL
```
https://your-server:port/api
```

### Authentication
- Typically requires JWT Bearer Token in Authorization header
- Format: `Authorization: Bearer {token}`

### Endpoints List

| Category | Controller | Method | Endpoint | Purpose |
|----------|-----------|--------|----------|---------|
| **User Management** | User | GET | `/user` | List all users |
| | User | GET | `/user/{id}` | Get user details |
| | User | POST | `/user` | Create user |
| | User | PUT | `/user/{id}` | Update user |
| | User | DELETE | `/user/{id}` | Delete user |
| **Products** | Products | GET | `/products` | List all products |
| | Products | POST | `/products` | Create product |
| | Products | PUT | `/products/{id}` | Update product |
| | Products | DELETE | `/products/{id}` | Delete product |
| **Suppliers** | Supplier | GET | `/supplier` | List suppliers |
| | Supplier | GET | `/supplier/{id}` | Get supplier |
| | Supplier | POST | `/supplier` | Create supplier |
| | Supplier | PUT | `/supplier/{id}` | Update supplier |
| | Supplier | DELETE | `/supplier/{id}` | Delete supplier |
| **Stock** | Stock | GET | `/stock` | List stock records |
| | Stock | POST | `/stock` | Create stock |
| | Stock | PUT | `/stock/{id}` | Update stock |
| | Stock | DELETE | `/stock/{id}` | Delete stock |
| **Orders** | Orders | GET | `/orders` | List orders |
| | Orders | GET | `/orders/{id}` | Get order |
| | Orders | POST | `/orders` | Create order |
| | Orders | PUT | `/orders/{id}` | Update order |
| | Orders | DELETE | `/orders/{id}` | Delete order |
| **Order Items** | OrderItems | GET | `/orderitems` | List order items |
| | OrderItems | GET | `/orderitems/{id}` | Get item |
| | OrderItems | POST | `/orderitems` | Create item |
| | OrderItems | PUT | `/orderitems/{id}` | Update item |
| | OrderItems | DELETE | `/orderitems/{id}` | Delete item |
| **Payments** | Payment | GET | `/payment` | List payments |
| | Payment | GET | `/payment/{id}` | Get payment |
| | Payment | POST | `/payment` | Create payment |
| | Payment | PUT | `/payment/{id}` | Update payment |
| | Payment | DELETE | `/payment/{id}` | Delete payment |
| **Invoices** | Invoice | GET | `/invoice` | List invoices |
| | Invoice | GET | `/invoice/{id}` | Get invoice |
| | Invoice | POST | `/invoice` | Create invoice |
| | Invoice | PUT | `/invoice/{id}` | Update invoice |
| | Invoice | DELETE | `/invoice/{id}` | Delete invoice |
| **Receipts** | Receipt | GET | `/receipt` | List receipts |
| | Receipt | GET | `/receipt/{id}` | Get receipt |
| | Receipt | POST | `/receipt` | Create receipt |
| | Receipt | PUT | `/receipt/{id}` | Update receipt |
| **Stock Movement** | StockMovement | GET | `/stockmovement` | List movements |
| | StockMovement | GET | `/stockmovement/{id}` | Get movement |
| | StockMovement | POST | `/stockmovement` | Record movement |
| | StockMovement | PUT | `/stockmovement/{id}` | Update movement |
| **Replenishment** | Replenishment | GET | `/replenishment` | List replenishments |
| | Replenishment | GET | `/replenishment/{id}` | Get replenishment |
| | Replenishment | POST | `/replenishment` | Create replenishment |
| | Replenishment | PUT | `/replenishment/{id}` | Update replenishment |
| **Purchase Orders** | PurchaseOrder | GET | `/purchaseorder` | List POs |
| | PurchaseOrder | GET | `/purchaseorder/{id}` | Get PO |
| | PurchaseOrder | POST | `/purchaseorder` | Create PO |
| | PurchaseOrder | PUT | `/purchaseorder/{id}` | Update PO |

---

## Summary

InStore Optima is a complete inventory management solution featuring:

 **17 Domain Models** for comprehensive data management <br>
 **12 API Controllers** exposing RESTful endpoints <br>
 **Layered Architecture** for clean separation of concerns<br>
 **Entity Framework Core** for data persistence <br>
 **SQL Server** database with migrations <br>
 **Audit Logging** for compliance and tracking <br>
 **Automated Replenishment** workflow <br>
 **Complete Order-to-Invoice** pipeline <br>
 **Notification System** for user alerts <br>
 **Task Management** for operational tracking <br>

---

**Project Repository**: https://github.com/Saiumashankar11/instore_optima
**Framework**: .NET 8.0
**Database**: SQL Server
**Last Updated**: 2025
