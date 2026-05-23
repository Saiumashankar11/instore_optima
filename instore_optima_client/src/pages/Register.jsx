import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerApi } from '../services/authService'
import { useTheme } from '../context/ThemeContext'

export default function Register() {
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Staff' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setForm({ name: '', email: '', password: '', role: 'Staff' })
    setError('')
  }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    setError('')
    if (!form.name || !form.email || !form.password) return setError('All fields are required.')
    setLoading(true)
    try {
      await registerApi(form)
      setSuccess('Account created! Redirecting to login...')
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      const data = err.response?.data
      const fieldError = data?.errors ? Object.values(data.errors).flat()[0] : null
      setError(fieldError || data?.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  // Add the following styles to ensure text is white in dark mode

  return (
    <div className="login-page">
      {/* theme toggle */}
      <button type="button" className="login-theme-toggle" onClick={toggle} title="Toggle theme">
        <i className={`bi bi-${dark ? 'sun' : 'moon'}`}></i>
      </button>

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
          {[
            'Full inventory visibility',
            'Role-based access control',
            'Real-time notifications',
            'Audit log & compliance',
          ].map(f => (
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
            <div className="login-input-wrap">
              <i className="bi bi-person login-input-icon"></i>
              <input className="form-control-custom login-input"
                placeholder="John Doe" value={form.name}
                onChange={set('name')} autoComplete="off" />
            </div>
          </div>
          <div className="login-field">
            <label className="form-label-custom">Email address</label>
            <div className="login-input-wrap">
              <i className="bi bi-envelope login-input-icon"></i>
              <input className="form-control-custom login-input"
                type="email" placeholder="you@company.com"
                value={form.email} onChange={set('email')} autoComplete="email" />
            </div>
          </div>
          <div className="login-field">
            <label className="form-label-custom">Password</label>
            <div className="login-input-wrap">
              <i className="bi bi-lock login-input-icon"></i>
              <input className="form-control-custom login-input"
                type="password" placeholder="••••••••"
                value={form.password} onChange={set('password')} autoComplete="new-password" />
            </div>
          </div>
          <div className="login-field">
            <label className="form-label-custom">Role</label>
            <select className="form-control-custom" value={form.role} onChange={set('role')}>
              <option>Admin</option>
              <option>Manager</option>
              <option>Staff</option>
            </select>
          </div>

          <button className="login-submit" onClick={handleSubmit} disabled={loading}>
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