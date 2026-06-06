// productsService.js
// API calls for the product catalogue (inventory module).
// Products define what the store sells; each product links to a supplier and has stock rules.

import axiosClient from '../api/axiosClient'
// GET    /api/products      — fetch all products in the catalogue
export const getAllProducts  = ()         => axiosClient.get('/api/products')
// POST   /api/products      — create a new product
export const createProduct  = (data)     => axiosClient.post('/api/products', data)
// PUT    /api/products/:id  — update product details (name, price, stock limits, etc.)
export const updateProduct  = (id, data) => axiosClient.put(`/api/products/${id}`, data)
// DELETE /api/products/:id  — remove a product from the catalogue
export const deleteProduct  = (id)       => axiosClient.delete(`/api/products/${id}`)