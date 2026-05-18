import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import TopNavLayout from './components/TopNavLayout'
import InnerLayout from './components/InnerLayout'

import Login        from './pages/Login'
import Register     from './pages/Register'
import Dashboard    from './pages/Dashboard'
import Products     from './pages/Products'
import Stock        from './pages/Stock'
import StockMovement from './pages/StockMovement'
import Suppliers    from './pages/Suppliers'
import Replenishment from './pages/Replenishment'
import PurchaseOrders from './pages/PurchaseOrders'
import Orders       from './pages/Orders'
import OrderItems   from './pages/OrderItems'
import Payments     from './pages/Payments'
import Invoices     from './pages/Invoices'
import Receipts     from './pages/Receipts'
import Users        from './pages/Users'
import AuditLogs    from './pages/AuditLogs'

function RequireAuth({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Dashboard — top navbar only, hero layout */}
          <Route path="/dashboard" element={
            <RequireAuth><TopNavLayout /></RequireAuth>
          }>
            <Route index element={<Dashboard />} />
          </Route>

          {/* All inner pages — top navbar + contextual sidebar */}
          <Route path="/" element={
            <RequireAuth><InnerLayout /></RequireAuth>
          }>
            <Route path="products"       element={<Products />} />
            <Route path="stock"          element={<Stock />} />
            <Route path="stock-movement" element={<StockMovement />} />
            <Route path="suppliers"      element={<Suppliers />} />
            <Route path="replenishment"  element={<Replenishment />} />
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="orders"         element={<Orders />} />
            <Route path="order-items"    element={<OrderItems />} />
            <Route path="payments"       element={<Payments />} />
            <Route path="invoices"       element={<Invoices />} />
            <Route path="receipts"       element={<Receipts />} />
            <Route path="users"          element={<Users />} />
            <Route path="audit-logs"     element={<AuditLogs />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}