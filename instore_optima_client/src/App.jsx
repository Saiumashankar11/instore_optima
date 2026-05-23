import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AccessDenied from './components/shared/AccessDenied'

import TopNavLayout from './components/TopNavLayout'
import InnerLayout from './components/InnerLayout'

import Login        from './pages/Login'
import Register     from './pages/Register'
import LandingPage from './pages/LandingPage'
import Dashboard    from './pages/Dashboard'
import Products     from './pages/Products'
import Stock        from './pages/Stock'
import StockMovement from './pages/StockMovement'
import Suppliers    from './pages/Suppliers'
import Replenishment from './pages/Replenishment'
import PurchaseOrders from './pages/PurchaseOrders'
import Orders       from './pages/Orders'
import Payments     from './pages/Payments'
import Invoices     from './pages/Invoices'
import Receipts     from './pages/Receipts'
import Users        from './pages/Users'
import AuditLogs    from './pages/AuditLogs'

// Redirect unauthenticated users to login
function RequireAuth({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

// Blocks access if the :role in the URL doesn't match the logged-in user's actual role.
// e.g. an admin URL copied and opened by a staff user gets redirected to their own dashboard.
function RoleUrlGuard({ children }) {
  const { user, role } = useAuth()
  const { role: urlRole } = useParams()
  if (!user) return <Navigate to="/login" replace />
  if (urlRole?.toLowerCase() !== role?.toLowerCase()) {
    return <Navigate to={`/${role.toLowerCase()}/dashboard`} replace />
  }
  return children
}

// Shows an access-denied panel if the user's role is not in the allowed list
function RequireRole({ roles, children }) {
  const { role } = useAuth()
  if (!roles.includes(role)) {
    const required = roles.includes('Admin') && !roles.includes('Manager') ? 'Admin' : 'Manager'
    return <AccessDenied role={role} requiredRole={required} />
  }
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"         element={<LandingPage />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Role-scoped routes — all paths carry /:role prefix */}
          <Route path="/:role" element={<RequireAuth><RoleUrlGuard><TopNavLayout /></RoleUrlGuard></RequireAuth>}>
            <Route path="dashboard" element={<Dashboard />} />
          </Route>

          <Route path="/:role" element={<RequireAuth><RoleUrlGuard><InnerLayout /></RoleUrlGuard></RequireAuth>}>
            <Route path="products"        element={
              <RequireRole roles={['Admin','Manager']}><Products /></RequireRole>
            } />
            <Route path="stock"           element={<Stock />} />
            <Route path="stock-movement"  element={<StockMovement />} />
            <Route path="suppliers"       element={
              <RequireRole roles={['Admin','Manager']}><Suppliers /></RequireRole>
            } />
            <Route path="replenishment"   element={
              <RequireRole roles={['Admin','Manager']}><Replenishment /></RequireRole>
            } />
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="orders"          element={<Orders />} />
            <Route path="payments"        element={<Payments />} />
            <Route path="invoices"        element={<Invoices />} />
            <Route path="receipts"        element={<Receipts />} />
            <Route path="users"           element={
              <RequireRole roles={['Admin','Manager']}><Users /></RequireRole>
            } />
            <Route path="audit-logs"      element={
              <RequireRole roles={['Admin']}><AuditLogs /></RequireRole>
            } />
          </Route>

          {/* Fallback redirects */}
          <Route path="/dashboard" element={<RoleRedirect page="dashboard" />} />
          <Route path="*"          element={<RoleRedirectOrLanding />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

// Redirects bare paths like /dashboard → /admin/dashboard based on current role
function RoleRedirect({ page }) {
  const { user, role } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={`/${role.toLowerCase()}/${page}`} replace />
}

// Unknown paths: authenticated → dashboard, unauthenticated → landing page
function RoleRedirectOrLanding() {
  const { user, role } = useAuth()
  if (!user) return <Navigate to="/" replace />
  return <Navigate to={`/${role.toLowerCase()}/dashboard`} replace />
}