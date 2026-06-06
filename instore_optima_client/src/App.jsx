// App.jsx
// Root component of the application. Responsibilities:
//   1. Wraps the whole app in global context providers (auth, messages, alert badges, error boundary).
//   2. Defines every client-side route using React Router.
//   3. Lazy-loads each page component so the initial JS bundle is as small as possible.
//   4. Manages an app-level zoom level that scales the content wrapper independently of the browser.
//   5. Guards routes by authentication status and by user role.

// React Router components: BrowserRouter sets up history, Routes/Route define URL paths,
// Navigate performs redirects, useParams reads dynamic URL segments like :role.
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
// AuthProvider stores the logged-in user; useAuth reads that data from any component
import { AuthProvider, useAuth } from './context/AuthContext'
// MessagesProvider enables real-time in-app messaging context
import { MessagesProvider } from './context/MessagesContext'
// AlertBadgesProvider tracks counts for notifications shown in the nav bar
import { AlertBadgesProvider } from './context/AlertBadgesContext'
// Shown when a user tries to access a page they do not have permission to see
import AccessDenied from './components/shared/AccessDenied'
// Catches unexpected runtime errors so the whole app doesn't go blank
import ErrorBoundary from './components/shared/ErrorBoundary'
// React hooks and helpers for state, effects, lazy loading, and Suspense
import { useState, useEffect, lazy, Suspense } from 'react'

// Layout shells: TopNavLayout includes the top navigation bar (used for Dashboard/Messages/Profile),
// InnerLayout adds a sidebar for all other pages.
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
  // Zoom level (50–150). Initialised from localStorage so it persists across sessions.
  const [zoom, setZoom] = useState(() => Number(localStorage.getItem('appZoom')) || 100)
  // Set briefly to true when the browser's own zoom level changes, so a banner can be shown.
  const [browserZoomDetected, setBrowserZoomDetected] = useState(false)

  // Apply zoom only to content wrapper, not navbar
  useEffect(() => {
    const contentWrapper = document.getElementById('app-content-wrapper')
    if (contentWrapper) {
      const zoomRatio = zoom / 100
      // CSS transform scales the element; adjusting width compensates for the layout space it leaves
      contentWrapper.style.transform = `scale(${zoomRatio})`
      contentWrapper.style.transformOrigin = 'top left'
      contentWrapper.style.width = `${100 / zoomRatio}%`
      contentWrapper.style.height = `auto`
    }
    // Persist the user's chosen zoom level across page refreshes
    localStorage.setItem('appZoom', zoom)
  }, [zoom])

  // Detect browser zoom changes
  useEffect(() => {
    let lastDevicePixelRatio = window.devicePixelRatio
    const checkBrowserZoom = () => {
      // devicePixelRatio changes when the user zooms the browser in/out
      if (Math.abs(window.devicePixelRatio - lastDevicePixelRatio) > 0.01) {
        // Browser zoom changed — reset app zoom to 100%
        setZoom(100)
        setBrowserZoomDetected(true)
        // Hide the notification banner after 4 seconds
        setTimeout(() => setBrowserZoomDetected(false), 4000)
        lastDevicePixelRatio = window.devicePixelRatio
      }
    }
    window.addEventListener('resize', checkBrowserZoom)
    // Cleanup: remove the listener when the component unmounts
    return () => window.removeEventListener('resize', checkBrowserZoom)
  }, [])

  // --- Render ---
  return (
    // ErrorBoundary catches any unhandled JS errors and shows a fallback UI
    <ErrorBoundary>
    <AuthProvider>
      <MessagesProvider>
      <AlertBadgesProvider>
      <BrowserRouter>
        {/* app-content-wrapper is the element that the zoom transform is applied to */}
        <div id="app-content-wrapper">
        {/* Suspense shows RouteFallback (spinner) while a lazy page chunk is loading */}
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public routes — accessible without being logged in */}
          <Route path="/"                  element={<LandingPage zoom={zoom} setZoom={setZoom} />} />
          <Route path="/login"            element={<Login zoom={zoom} setZoom={setZoom} />} />
          <Route path="/register"         element={<Register zoom={zoom} setZoom={setZoom} />} />
          <Route path="/forgot-password"  element={<ForgotPassword zoom={zoom} setZoom={setZoom} />} />

          {/* Role-scoped routes — all paths carry /:role prefix */}
          {/* TopNavLayout: dashboard, messages, profile — full-width pages with just a top nav */}
          <Route path="/:role" element={<RequireAuth><RoleUrlGuard><TopNavLayout zoom={zoom} setZoom={setZoom} browserZoomDetected={browserZoomDetected} /></RoleUrlGuard></RequireAuth>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="messages"  element={<Messages />} />
            <Route path="profile"   element={<Profile />} />
          </Route>

          {/* InnerLayout: all other pages — includes a sidebar navigation panel */}
          <Route path="/:role" element={<RequireAuth><RoleUrlGuard><InnerLayout zoom={zoom} setZoom={setZoom} browserZoomDetected={browserZoomDetected} /></RoleUrlGuard></RequireAuth>}>
            {/* Admin and Manager only */}
            <Route path="products"        element={
              <RequireRole roles={['Admin','Manager']}><Products /></RequireRole>
            } />
            {/* Stock and stock movement are visible to all roles */}
            <Route path="stock"           element={<Stock />} />
            <Route path="stock-movement"  element={<StockMovement />} />
            {/* Admin and Manager only */}
            <Route path="suppliers"       element={
              <RequireRole roles={['Admin','Manager']}><Suppliers /></RequireRole>
            } />
            <Route path="replenishment"   element={
              <RequireRole roles={['Admin','Manager']}><Replenishment /></RequireRole>
            } />
            {/* Purchase orders, orders, payments, invoices, receipts — all roles */}
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="orders"          element={<Orders />} />
            <Route path="payments"        element={<Payments />} />
            <Route path="invoices"        element={<Invoices />} />
            <Route path="receipts"        element={<Receipts />} />
            {/* Admin and Manager only */}
            <Route path="users"           element={
              <RequireRole roles={['Admin','Manager']}><Users /></RequireRole>
            } />
            {/* Audit logs are restricted to Admin only */}
            <Route path="audit-logs"      element={
              <RequireRole roles={['Admin']}><AuditLogs /></RequireRole>
            } />
          </Route>

          {/* Fallback redirects */}
          {/* /dashboard (without a role) redirects to the correct role-prefixed dashboard */}
          <Route path="/dashboard" element={<RoleRedirect page="dashboard" />} />
          {/* Any unknown URL sends authenticated users to their dashboard, others to landing */}
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