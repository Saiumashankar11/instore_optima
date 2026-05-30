import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerApi } from '../services/authService'
import { useTheme } from '../context/ThemeContext'
import { validateField, parseApiError } from '../utils/validators'
import ZoomControl from '../components/ZoomControl'

export default function Register({ zoom = 100, setZoom = () => {} }) {
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Staff' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState({})

  useEffect(() => {
    setForm({ name: '', email: '', password: '', role: 'Staff' })
    setError('')
    setFieldErrors({})
  }, [])

  const handleChange = (field) => (e) => {
    const value = e.target.value
    setForm(f => ({ ...f, [field]: value }))
    if (touched[field]) {
      const err = validateField(field, value)
      setFieldErrors(prev => ({ ...prev, [field]: err }))
    }
    if (error) setError('')
  }

  const handleBlur = (field) => () => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const err = validateField(field, form[field])
    setFieldErrors(prev => ({ ...prev, [field]: err }))
  }

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

  return (
    <div className="login-page">
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

      <div className="login-right">
        <div className="login-right-grid"></div>
        <div className="login-right-glow"></div>
        <div className="login-card">
          <div className="login-card-icon"><img src="/logo-1.png" alt="InStore Optima" style={{ height: 56, objectFit: 'contain' }} /></div>
          <h1 className="login-card-title">Create account</h1>
          <p className="login-card-sub">Join InStore Optima</p>

          {error && (
            <div className="login-alert-error">
              <i className="bi bi-exclamation-circle"></i>{error}
            </div>
          )}
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
    </div>
  )
}
