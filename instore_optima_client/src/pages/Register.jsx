// =============================================================================
// Register.jsx
// =============================================================================
// New-user registration page. Displays a two-panel layout (decorative left
// panel + form card on the right) that matches the Login page visually.
//
// The form collects name, email, password, and role (Admin / Manager / Staff).
// Validation runs in two modes:
//   - On blur: validates only the field the user just left (avoids nagging
//     before the user has finished typing).
//   - On submit: validates all fields at once and blocks submission if any fail.
//
// On success the user is redirected to /login after a short delay.
// =============================================================================

// React state and effect hooks.
import { useState, useEffect } from 'react'
// useNavigate for programmatic redirect; Link for the "already have an account" link.
import { useNavigate, Link } from 'react-router-dom'
// API call that sends the registration payload to the backend.
import { registerApi } from '../services/authService'
// Theme context provides the current dark/light mode and a toggle function.
import { useTheme } from '../context/ThemeContext'
// validateField checks a single field against its rules; parseApiError extracts
// a human-readable message from an Axios error response.
import { validateField, parseApiError } from '../utils/validators'
// UI components: browser zoom slider and a support contact modal.
import ZoomControl from '../components/ZoomControl'
import ContactSupportModal from '../components/ContactSupportModal'

// zoom and setZoom are passed down from App.jsx so the zoom control on this
// page is synchronised with the rest of the application.
export default function Register({ zoom = 100, setZoom = () => {} }) {
  // dark: boolean for current theme; toggle: function to switch dark/light.
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  // ── State ──────────────────────────────────────────────────────────────────
  const [supportOpen, setSupportOpen] = useState(false)      // controls the support modal
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Staff' })
  const [fieldErrors, setFieldErrors] = useState({})          // per-field error messages
  const [error, setError] = useState('')                       // global API error banner
  const [success, setSuccess] = useState('')                   // success banner after registration
  const [loading, setLoading] = useState(false)               // true while the API call is in flight
  const [showPassword, setShowPassword] = useState(false)     // toggle password visibility
  // touched tracks which fields the user has interacted with; only touched
  // fields show inline validation errors (avoids red highlights on first load).
  const [touched, setTouched] = useState({})

  // Reset the form when the component first mounts. This guards against stale
  // form state if the component is unmounted and remounted (e.g. navigating away
  // and back) while React's strict-mode double-invocation is active.
  useEffect(() => {
    setForm({ name: '', email: '', password: '', role: 'Staff' })
    setError('')
    setFieldErrors({})
  }, [])

  // ── Handlers ───────────────────────────────────────────────────────────────
  // Updates the form value and — only if the field has been touched before —
  // re-runs validation so the error clears as soon as the user fixes it.
  // Also clears the global API error banner so it doesn't linger after typing.
  const handleChange = (field) => (e) => {
    const value = e.target.value
    setForm(f => ({ ...f, [field]: value }))
    if (touched[field]) {
      const err = validateField(field, value)
      setFieldErrors(prev => ({ ...prev, [field]: err }))
    }
    if (error) setError('')
  }

  // Fires when the user leaves a field (onBlur). Marks the field as touched and
  // runs validation so the user sees feedback as they tab through the form.
  const handleBlur = (field) => () => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const err = validateField(field, form[field])
    setFieldErrors(prev => ({ ...prev, [field]: err }))
  }

  // Full-form validation on submit. Marks every field as touched so all errors
  // show at once, then returns early without calling the API if any field fails.
  // On success, a 1.5-second delay lets the user read the success banner before
  // being redirected to the login page.
  const handleSubmit = async () => {
    setError('')
    const nameErr = validateField('name', form.name)
    const emailErr = validateField('email', form.email)
    const passErr = validateField('password', form.password)
    const roleErr = validateField('role', form.role)
    const errors = { name: nameErr, email: emailErr, password: passErr, role: roleErr }
    setFieldErrors(errors)
    setTouched({ name: true, email: true, password: true, role: true })

    if (nameErr || emailErr || passErr || roleErr) return

    setLoading(true)
    try {
      await registerApi(form)
      setSuccess('Account created! Redirecting to login...')
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="login-page">
      {/* Top bar: back-to-home button on the left, zoom control + theme toggle on the right. */}
      <div className="login-top-controls">
        <button type="button" className="login-back-home" onClick={() => navigate('/')} title="Back to home">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11.5 7H2.5M6 3L2.5 7 6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Home
        </button>
        <div className="login-controls-right">
          <ZoomControl zoom={zoom} setZoom={setZoom} />
          <button type="button" className="login-theme-toggle" onClick={toggle} title="Toggle theme">
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Left decorative panel — brand logo, headline, and feature checklist.
          Purely visual; not shown on small screens (hidden via CSS). */}
      <div className="login-left">
        <div className="login-left-glow1"></div>
        <div className="login-left-glow2"></div>
        <div className="login-left-top">
          <div className="login-brand">
            <div className="login-brand-icon"><img src="/logo.png" alt="InStore Optima" style={{ height: 50 }} /></div>
          </div>
          <div className="login-left-headline">
            Join your team.<br/>
            <span>Start managing.</span>
          </div>
          <div className="login-left-sub">
            Create your account and get access to the complete InStore Optima platform.
          </div>
        </div>
        <div className="login-features">
          {['Full inventory visibility', 'Role-based access control', 'Real-time notifications', 'Audit log & compliance'].map(f => (
            <div key={f} className="login-feature-row">
              <div className="login-feature-check"><i className="bi bi-check-lg"></i></div>
              <span>{f}</span>
            </div>
          ))}
        </div>
        <div className="login-left-footer">© 2026 InStore Optima</div>
      </div>

      {/* Right panel — the actual registration form card. */}
      <div className="login-right">
        <div className="login-right-grid"></div>
        <div className="login-right-glow"></div>
        <div className="login-card">
          <div className="login-card-icon"><img src="/logo-1.png" alt="InStore Optima" style={{ height: 56, objectFit: 'contain' }} /></div>
          <h1 className="login-card-title">Create account</h1>
          <p className="login-card-sub">Join InStore Optima</p>

          {/* Global error banner (e.g. "email already in use" from the API). */}
          {error && (
            <div className="login-alert-error">
              <i className="bi bi-exclamation-circle"></i>{error}
            </div>
          )}
          {/* Success banner shown briefly before redirect. */}
          {success && (
            <div className="login-alert-success">
              <i className="bi bi-check-circle"></i>{success}
            </div>
          )}

          <div className="login-field">
            <label className="form-label-custom">Full Name</label>
            <div className={`login-input-wrap ${fieldErrors.name ? 'input-error' : ''}`}>
              <i className="bi bi-person login-input-icon"></i>
              <input className="form-control-custom login-input"
                placeholder="John Doe" value={form.name}
                onChange={handleChange('name')} onBlur={handleBlur('name')} autoComplete="off" />
            </div>
            {fieldErrors.name && <span className="field-error-text">{fieldErrors.name}</span>}
          </div>

          <div className="login-field">
            <label className="form-label-custom">Email address</label>
            <div className={`login-input-wrap ${fieldErrors.email ? 'input-error' : ''}`}>
              <i className="bi bi-envelope login-input-icon"></i>
              <input className="form-control-custom login-input"
                type="text" placeholder="you@company.com"
                value={form.email} onChange={handleChange('email')} onBlur={handleBlur('email')} autoComplete="new-password" />
            </div>
            {fieldErrors.email && <span className="field-error-text">{fieldErrors.email}</span>}
          </div>

          <div className="login-field">
            <label className="form-label-custom">Password</label>
            <div className={`login-input-wrap ${fieldErrors.password ? 'input-error' : ''}`}>
              <i className="bi bi-lock login-input-icon"></i>
              <input className="form-control-custom login-input"
                type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                value={form.password} onChange={handleChange('password')} onBlur={handleBlur('password')} autoComplete="new-password" />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(p => !p)}
                tabIndex={-1}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
            {fieldErrors.password && <span className="field-error-text">{fieldErrors.password}</span>}
            {/* Show a password-strength hint only while the user is typing and
                there is no validation error — avoids showing two messages at once. */}
            {!fieldErrors.password && form.password && (
              <span className="field-hint-text">Must have uppercase, lowercase, and a number (min 6 chars).</span>
            )}
          </div>

          <div className="login-field">
            <label className="form-label-custom">Role</label>
            <select className={`form-control-custom ${fieldErrors.role ? 'input-error-select' : ''}`} value={form.role} onChange={handleChange('role')}>
              <option>Admin</option>
              <option>Manager</option>
              <option>Staff</option>
            </select>
            {fieldErrors.role && <span className="field-error-text">{fieldErrors.role}</span>}
          </div>

          <button className="login-submit" type="button" onClick={handleSubmit} disabled={loading}>
            {loading
              ? 'Creating account...'
              : <>Create Account <i className="bi bi-arrow-right"></i></>
            }
          </button>
          <p className="login-footer-text">
            Already have an account?{' '}
            <Link to="/login" className="login-link">Sign in</Link>
          </p>
        </div>
      </div>

      {/* Floating "Contact Support" button anchored to the bottom-right corner
          of the page — opens the ContactSupportModal on click. */}
      <div style={{ position: 'absolute', bottom: 16, right: 24 }}>
        <button
          type="button"
          onClick={() => setSupportOpen(true)}
          style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--text-600, #64748b)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="bi bi-headset"></i> Contact Support
        </button>
      </div>

      {/* Support modal — rendered here so it can overlay the full page. */}
      <ContactSupportModal show={supportOpen} onHide={() => setSupportOpen(false)} />
    </div>
  )
}
