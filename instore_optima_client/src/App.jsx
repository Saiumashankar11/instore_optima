import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { MessagesProvider } from './context/MessagesContext'
import { AlertBadgesProvider } from './context/AlertBadgesContext'
import AccessDenied from './components/shared/AccessDenied'
import ErrorBoundary from './components/shared/ErrorBoundary'
import { useState, useEffect, lazy, Suspense } from 'react'

import TopNavLayout from './components/TopNavLayout'
import InnerLayout from './components/InnerLayout'

// Route-level code splitting — each page becomes its own lazily-loaded chunk
// so the initial bundle stays small and pages load on demand.
const Login           = lazy(() => import('./pages/Login'))
const Register        = lazy(() => import('./pages/Register'))
const LandingPage     = lazy(() => import('./pages/LandingPage'))
const ForgotPassword  = lazy(() => import('./pages/ForgotPassword'))
const Profile         = lazy(() => import('./pages/Profile'))
const Dashboard       = lazy(() => import('./pages/Dashboard'))
const Products        = lazy(() => import('./pages/Products'))
const Stock           = lazy(() => import('./pages/Stock'))
const StockMovement   = lazy(() => import('./pages/StockMovement'))
const Suppliers       = lazy(() => import('./pages/Suppliers'))
const Replenishment   = lazy(() => import('./pages/Replenishment'))
const PurchaseOrders  = lazy(() => import('./pages/PurchaseOrders'))
const Orders          = lazy(() => import('./pages/Orders'))
const Payments        = lazy(() => import('./pages/Payments'))
const Invoices        = lazy(() => import('./pages/Invoices'))
const Receipts        = lazy(() => import('./pages/Receipts'))
const Users           = lazy(() => import('./pages/Users'))
const AuditLogs       = lazy(() => import('./pages/AuditLogs'))
const Messages        = lazy(() => import('./pages/Messages'))

// Lightweight fallback shown while a route chunk loads.
function RouteFallback() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loading-spinner"><span/><span/><span/></div>
    </div>
  )
}

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
  const [zoom, setZoom] = useState(() => Number(localStorage.getItem('appZoom')) || 100)
  const [browserZoomDetected, setBrowserZoomDetected] = useState(false)

  // Apply zoom only to content wrapper, not navbar
  useEffect(() => {
    const contentWrapper = document.getElementById('app-content-wrapper')
    if (contentWrapper) {
      const zoomRatio = zoom / 100
      contentWrapper.style.transform = `scale(${zoomRatio})`
      contentWrapper.style.transformOrigin = 'top left'
      contentWrapper.style.width = `${100 / zoomRatio}%`
      contentWrapper.style.height = `auto`
    }
    localStorage.setItem('appZoom', zoom)
  }, [zoom])

  // Detect browser zoom changes
  useEffect(() => {
    let lastDevicePixelRatio = window.devicePixelRatio
    const checkBrowserZoom = () => {
      if (Math.abs(window.devicePixelRatio - lastDevicePixelRatio) > 0.01) {
        // Browser zoom changed — reset app zoom to 100%
        setZoom(100)
        setBrowserZoomDetected(true)
        setTimeout(() => setBrowserZoomDetected(false), 4000)
        lastDevicePixelRatio = window.devicePixelRatio
      }
    }
    window.addEventListener('resize', checkBrowserZoom)
    return () => window.removeEventListener('resize', checkBrowserZoom)
  }, [])

  return (
    <ErrorBoundary>
    <AuthProvider>
      <MessagesProvider>
      <AlertBadgesProvider>
      <BrowserRouter>
        <div id="app-content-wrapper">
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/"                  element={<LandingPage zoom={zoom} setZoom={setZoom} />} />
          <Route path="/login"            element={<Login zoom={zoom} setZoom={setZoom} />} />
          <Route path="/register"         element={<Register zoom={zoom} setZoom={setZoom} />} />
          <Route path="/forgot-password"  element={<ForgotPassword zoom={zoom} setZoom={setZoom} />} />

          {/* Role-scoped routes — all paths carry /:role prefix */}
          <Route path="/:role" element={<RequireAuth><RoleUrlGuard><TopNavLayout zoom={zoom} setZoom={setZoom} browserZoomDetected={browserZoomDetected} /></RoleUrlGuard></RequireAuth>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="messages"  element={<Messages />} />
            <Route path="profile"   element={<Profile />} />
          </Route>

          <Route path="/:role" element={<RequireAuth><RoleUrlGuard><InnerLayout zoom={zoom} setZoom={setZoom} browserZoomDetected={browserZoomDetected} /></RoleUrlGuard></RequireAuth>}>
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
        </Suspense>
        </div>
      </BrowserRouter>
      </AlertBadgesProvider>
      </MessagesProvider>
    </AuthProvider>
    </ErrorBoundary>
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