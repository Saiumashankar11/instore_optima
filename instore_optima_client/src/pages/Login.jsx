import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { loginApi } from '../services/authService'
import { validateField, parseApiError } from '../utils/validators'
import ZoomControl from '../components/ZoomControl'

export default function Login({ zoom = 100, setZoom = () => {} }) {
  const { login } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState({})

  useEffect(() => {
    setForm({ email: '', password: '' })
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
    const emailErr = validateField('email', form.email)
    const passErr = form.password ? '' : 'Password is required.'
    const errors = { email: emailErr, password: passErr }
    setFieldErrors(errors)
    setTouched({ email: true, password: true })

    if (emailErr || passErr) return

    setLoading(true)
    try {
      const res = await loginApi(form)
      const { token, userId, role, name, email } = res.data
      login(token, { userId, role, name, email })
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 1400)
    } catch (err) {
      setError(parseApiError(err))
      setLoading(false)
    }
  }

  if (success) return (
    <div className="login-success-screen">
      <div className="login-success-inner">
        <div className="login-success-icon" style={{ background: 'none', border: 'none', width: 'auto', height: 'auto' }}>
          <img src="/logo-1.png" alt="InStore Optima" style={{ height: 80, objectFit: 'contain' }} />
        </div>
        <div className="login-success-title">Welcome back</div>
        <div className="login-success-sub">Taking you to your dashboard...</div>
        <div className="login-success-bar">
          <div className="login-success-fill"></div>
        </div>
      </div>
    </div>
  )

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
            Smart inventory.<br/>
            <span>Zero stockouts.</span>
          </div>
          <div className="login-left-sub">
            Automated replenishment, real-time tracking, and a complete order pipeline — all in one place.
          </div>
        </div>
        <div className="login-features">
          {['Real-time stock tracking', 'Auto replenishment rules', 'Complete order pipeline', 'Finance & invoice management'].map(f => (
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
          <h1 className="login-card-title">Welcome back</h1>
          <p className="login-card-sub">Sign in to your account</p>

          {error && (
            <div className="login-alert-error">
              <i className="bi bi-exclamation-circle"></i>{error}
            </div>
          )}

          <div className="login-field">
            <label className="form-label-custom">Email address</label>
            <div className={`login-input-wrap ${fieldErrors.email ? 'input-error' : ''}`}>
              <i className="bi bi-envelope login-input-icon"></i>
              <input
                className="form-control-custom login-input"
                type="text"
                placeholder="you@company.com"
                value={form.email}
                onChange={handleChange('email')}
                onBlur={handleBlur('email')}
                autoComplete="new-password"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
            {fieldErrors.email && <span className="field-error-text">{fieldErrors.email}</span>}
          </div>

          <div className="login-field">
            <label className="form-label-custom">Password</label>
            <div className={`login-input-wrap ${fieldErrors.password ? 'input-error' : ''}`}>
              <i className="bi bi-lock login-input-icon"></i>
              <input
                className="form-control-custom login-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange('password')}
                onBlur={handleBlur('password')}
                autoComplete="new-password"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
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
          </div>

          <button className="login-submit" type="button" onClick={handleSubmit} disabled={loading}>
            {loading
              ? <><i className="bi bi-hourglass-split"></i> Signing in...</>
              : <>Sign In <i className="bi bi-arrow-right"></i></>
            }
          </button>

          <p className="login-footer-text">
            Don't have an account?{' '}
            <Link to="/register" className="login-link">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
