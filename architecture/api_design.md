# API Design

## User APIs
POST /register
POST /login

---

## Product APIs
GET /products
GET /products/{id}
POST /products
PUT /products/{id}
DELETE /products/{id}

---

## Order APIs
POST /orders
GET /orders
GET /orders/{id}

---

## Order Items APIs
POST /order-items

---

## Payment APIs
POST /payment
GET /payment/{order_id}

---

## Supplier APIs
GET /suppliers
POST /suppliers

---

## Stock APIs
GET /stock
PUT /stock/{product_id}