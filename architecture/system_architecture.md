# System Architecture

## Architecture Type
The system follows a 3-Tier Architecture:

1. Frontend Layer
2. Backend Layer
3. Database Layer

---

## Frontend Layer
The frontend layer is responsible for:
- User Interface (UI)
- User interactions
- Sending HTTP requests to backend APIs
- Displaying responses to users

---

## Backend Layer
The backend layer handles:
- Business logic
- Input validation
- API request processing
- Communication with the database

---

## Database Layer
The database layer is responsible for:
- Data storage
- Data retrieval
- Enforcing constraints (PK, FK, UNIQUE)
- Maintaining data integrity

---

## Modules

### User Management
Handles user registration, login, and role management.

### Product Management
Manages product details including name, price, and supplier.

### Inventory Management
Tracks stock levels and updates product inventory.

### Order Management
Handles order creation and manages order items.

### Payment Module
Processes payments and stores transaction details.

### Supplier Management
Maintains supplier information and relationships.

---

## Data Flow

### Place Order Flow
1. User clicks "Place Order"
2. Frontend sends request to backend
3. Backend validates request
4. Backend inserts data into Orders and Order_Items
5. Backend updates Stock
6. Response is sent to frontend

---

### Add Product Flow
1. User submits product details
2. Backend validates input
3. Data stored in Products table
4. Confirmation returned to frontend

---

### Payment Flow
1. User initiates payment
2. Backend processes payment
3. Payment details stored in database
4. Order status updated