import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { loginApi } from '../services/authService'

export default function Login() {
  const { login } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setForm({ email: '', password: '' })
    setError('')
  }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    setError('')
    if (!form.email || !form.password) return setError('Email and password are required.')
    setLoading(true)
    try {
      const res = await loginApi(form)
      const { token, userId, role, name, email } = res.data
      login(token, { userId, role, name, email })
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 1400)
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.')
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

  // Add the following styles to ensure text is white in dark mode
  const labelStyle = { color: dark ? 'white' : 'black' }

  return (
    <div className="login-page">
      {/* Prevent browser autofill on the form */}
      <form autoComplete="off" style={{ display: 'contents' }}>
      {/* theme toggle — top right corner */}
      <button className="login-theme-toggle" onClick={toggle} title="Toggle theme">
        <i className={`bi bi-${dark ? 'sun' : 'moon'}`}></i>
      </button>

      {/* LEFT */}
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
          {[
            'Real-time stock tracking',
            'Auto replenishment rules',
            'Complete order pipeline',
            'Finance & invoice management',
          ].map(f => (
            <div key={f} className="login-feature-row">
              <div className="login-feature-check"><i className="bi bi-check-lg"></i></div>
              <span>{f}</span>
            </div>
          ))}
        </div>
        <div className="login-left-footer">© 2026 InStore Optima</div>
      </div>

      {/* RIGHT */}
      <div className="login-right">
        <div className="login-right-grid"></div>
        <div className="login-right-glow"></div>
        <div className="login-card">
          <div className="login-card-icon"><img src="/logo-1.png" alt="InStore Optima" style={{ height: 56, objectFit: 'contain' }} /></div>
          <h1 className="login-card-title">Welcome back</h1>
          <p className="login-card-sub">Sign in to your account</p>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              <i className="bi bi-exclamation-circle me-2"></i>{error}
            </div>
          )}

          <div className="login-field">
            <label className="form-label-custom" style={labelStyle}>Email address</label>
            <div className="login-input-wrap">
              <i className="bi bi-envelope login-input-icon"></i>
              <input
                className="form-control-custom login-input"
                type="email"
                name="login_email_2026"
                placeholder="you@company.com"
                value={form.email}
                onChange={set('email')}
                autoComplete="off"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
          </div>

          <div className="login-field">
            <label className="form-label-custom" style={labelStyle}>Password</label>
            <div className="login-input-wrap">
              <i className="bi bi-lock login-input-icon"></i>
              <input
                className="form-control-custom login-input"
                type="password"
                name="login_password_2026"
                placeholder="••••••••"
                value={form.password}
                onChange={set('password')}
                autoComplete="off"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
          </div>

          <button className="login-submit" type="button" onClick={handleSubmit} disabled={loading}>
            {loading
              ? <><i className="bi bi-hourglass-split"></i> Signing in...</>
              : <>Sign In <i className="bi bi-arrow-right"></i></>
            }
          </button>

          <p className="login-footer-text" style={{ color: dark ? 'white' : 'black' }}>
            Don't have an account?{' '}
            <Link to="/register" className="login-link">Create account</Link>
          </p>
        </div>
      </div>
      </form>
    </div>
  )
}