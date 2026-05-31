import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { loginApi, verifyOtpApi } from '../services/authService'
import axiosClient from '../api/axiosClient'
import { validateField, parseApiError } from '../utils/validators'
import ZoomControl from '../components/ZoomControl'

const OTP_EXPIRY_SEC  = 10 * 60   // 10 minutes (matches backend)
const RESEND_COOLDOWN = 60         // 60s before Resend is enabled again

// ── Credentials step ──────────────────────────────────────────────────────────
function CredentialsStep({ onOtpSent, dark, toggle, zoom, setZoom, navigate }) {
  const [form, setForm]               = useState({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched]         = useState({})

  const handleChange = field => e => {
    const value = e.target.value
    setForm(f => ({ ...f, [field]: value }))
    if (touched[field]) setFieldErrors(p => ({ ...p, [field]: validateField(field, value) }))
    if (error) setError('')
  }
  const handleBlur = field => () => {
    setTouched(p => ({ ...p, [field]: true }))
    setFieldErrors(p => ({ ...p, [field]: validateField(field, form[field]) }))
  }

  const handleSubmit = async () => {
    setError('')
    const emailErr = validateField('email', form.email)
    const passErr  = form.password ? '' : 'Password is required.'
    setFieldErrors({ email: emailErr, password: passErr })
    setTouched({ email: true, password: true })
    if (emailErr || passErr) return

    setLoading(true)
    try {
      const res = await loginApi(form)
      // Backend now always returns OTP challenge
      const { sessionKey, maskedEmail } = res.data
      onOtpSent(sessionKey, maskedEmail)
    } catch (err) {
      setError(parseApiError(err))
      setLoading(false)
    }
  }

  return (
    <>
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
            autoComplete="email"
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
            autoComplete="current-password"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          <button type="button" className="password-toggle-btn"
            onClick={() => setShowPassword(p => !p)} tabIndex={-1}
            title={showPassword ? 'Hide password' : 'Show password'}>
            <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
          </button>
        </div>
        {fieldErrors.password && <span className="field-error-text">{fieldErrors.password}</span>}
      </div>

      <button className="login-submit" type="button" onClick={handleSubmit} disabled={loading}>
        {loading
          ? <><i className="bi bi-hourglass-split"></i> Sending code...</>
          : <>Continue <i className="bi bi-arrow-right"></i></>}
      </button>

      <p className="login-footer-text">
        Don't have an account?{' '}
        <Link to="/register" className="login-link">Create account</Link>
      </p>
    </>
  )
}

const MAX_ATTEMPTS = 3

// ── OTP step ──────────────────────────────────────────────────────────────────
function OtpStep({ sessionKey: initialSessionKey, maskedEmail, onSuccess, onBack }) {
  const [digits, setDigits]         = useState(['', '', '', '', '', ''])
  const [sessionKey, setSessionKey] = useState(initialSessionKey)
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [resendCd, setResendCd]     = useState(RESEND_COOLDOWN)
  const [expiry, setExpiry]         = useState(OTP_EXPIRY_SEC)
  const [attempts, setAttempts]     = useState(0)   // wrong-OTP counter
  const inputRefs = useRef([])

  // Countdown timers
  useEffect(() => {
    const cd = setInterval(() => setResendCd(s => Math.max(0, s - 1)), 1000)
    const ex = setInterval(() => setExpiry(s => Math.max(0, s - 1)), 1000)
    return () => { clearInterval(cd); clearInterval(ex) }
  }, [])

  const fmt = sec => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`

  const handleDigit = (i, value) => {
    if (!/^\d?$/.test(value)) return
    const next = [...digits]
    next[i] = value.slice(-1)
    setDigits(next)
    setError('')
    if (value && i < 5) inputRefs.current[i + 1]?.focus()
    // Auto-submit when last digit filled
    if (value && i === 5) {
      const full = [...next].join('')
      if (full.length === 6) handleVerify([...next].join(''))
    }
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && i > 0)  inputRefs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) inputRefs.current[i + 1]?.focus()
  }

  const handlePaste = e => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    const next = [...pasted.padEnd(6, '').slice(0, 6).split('')]
    setDigits(next)
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
    if (pasted.length === 6) handleVerify(pasted)
  }

  const handleVerify = useCallback(async (otp) => {
    const code = otp ?? digits.join('')
    if (code.length < 6) { setError('Please enter all 6 digits.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await verifyOtpApi({ sessionKey, otp: code })
      const { token, userId, role, name, email } = res.data
      onSuccess(token, { userId, role, name, email })
    } catch (err) {
      const nextAttempts = attempts + 1
      setAttempts(nextAttempts)
      setDigits(['', '', '', '', '', ''])

      if (nextAttempts >= MAX_ATTEMPTS) {
        // All attempts used — force back to credential step
        onBack(`Too many incorrect codes. Please sign in again.`)
        return
      }

      const left = MAX_ATTEMPTS - nextAttempts
      setError(
        `Incorrect code. ${left} attempt${left !== 1 ? 's' : ''} remaining.`
      )
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }, [digits, sessionKey, attempts, onSuccess, onBack])

  const handleResend = async () => {
    if (resendCd > 0) return
    try {
      const res = await axiosClient.post('/api/auth/resend-otp', { sessionKey })
      setSessionKey(res.data.sessionKey)
      setResendCd(RESEND_COOLDOWN)
      setExpiry(OTP_EXPIRY_SEC)
      setDigits(['', '', '', '', '', ''])
      setError('')
      inputRefs.current[0]?.focus()
    } catch (err) {
      setError(parseApiError(err))
    }
  }

  const otp = digits.join('')

  return (
    <>
      {/* Shield icon */}
      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(8,145,178,.12)', border: '1.5px solid rgba(8,145,178,.35)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
          <i className="bi bi-shield-lock-fill" style={{ fontSize: 22, color: '#22d3ee' }}></i>
        </div>
        <h1 className="login-card-title" style={{ marginBottom: 4 }}>Verify your identity</h1>
        <p className="login-card-sub" style={{ marginBottom: 0 }}>
          A 6-digit code was sent to <strong style={{ color: '#e2e8f0' }}>{maskedEmail}</strong>
        </p>
      </div>

      {error && (
        <div className="login-alert-error" style={{ marginTop: 14 }}>
          <i className="bi bi-exclamation-circle"></i>{error}
        </div>
      )}

      {/* 6 digit boxes */}
      <div className="otp-boxes" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={el => inputRefs.current[i] = el}
            className={`otp-box${d ? ' otp-filled' : ''}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            autoFocus={i === 0}
            autoComplete="one-time-code"
          />
        ))}
      </div>

      {/* Expiry countdown */}
      <p className="otp-meta">
        {expiry > 0
          ? <>Code expires in <strong>{fmt(expiry)}</strong></>
          : <span style={{ color: '#f87171' }}>Code expired — please resend or go back</span>}
      </p>

      <button
        className="login-submit"
        type="button"
        onClick={() => handleVerify(otp)}
        disabled={loading || otp.length < 6}>
        {loading
          ? <><i className="bi bi-hourglass-split"></i> Verifying...</>
          : <>Verify &amp; Sign In <i className="bi bi-shield-check"></i></>}
      </button>

      <div className="otp-resend-row" style={{ marginTop: 16 }}>
        <button type="button" className="otp-back-btn" onClick={onBack}>
          <i className="bi bi-arrow-left"></i> Back to login
        </button>
        <span style={{ color: '#334155' }}>·</span>
        <button
          type="button"
          className="otp-resend-btn"
          disabled={resendCd > 0}
          onClick={handleResend}>
          {resendCd > 0 ? `Resend in ${resendCd}s` : 'Resend code'}
        </button>
      </div>
    </>
  )
}

// ── Main Login component ──────────────────────────────────────────────────────
export default function Login({ zoom = 100, setZoom = () => {} }) {
  const { login }         = useAuth()
  const { dark, toggle }  = useTheme()
  const navigate          = useNavigate()

  // 'credentials' | 'otp'
  const [step, setStep]             = useState('credentials')
  const [sessionKey, setSessionKey] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [success, setSuccess]       = useState(false)
  const [backMsg, setBackMsg]       = useState('')   // message shown after being kicked back

  useEffect(() => { /* reset on mount */ }, [])

  const handleOtpSent = (sk, me) => {
    setSessionKey(sk)
    setMaskedEmail(me)
    setBackMsg('')
    setStep('otp')
  }

  const handleOtpSuccess = (token, userData) => {
    login(token, userData)
    setSuccess(true)
    setTimeout(() => navigate('/dashboard'), 1400)
  }

  // msg is optional — passed when kicked back due to too many attempts
  const handleBack = (msg = '') => {
    setStep('credentials')
    setSessionKey('')
    setMaskedEmail('')
    setBackMsg(msg)
  }

  if (success) return (
    <div className="login-success-screen">
      <div className="login-success-inner">
        <div className="login-success-icon" style={{ background: 'none', border: 'none', width: 'auto', height: 'auto' }}>
          <img src="/logo-1.png" alt="InStore Optima" style={{ height: 80, objectFit: 'contain' }} />
        </div>
        <div className="login-success-title">Welcome back</div>
        <div className="login-success-sub">Taking you to your dashboard...</div>
        <div className="login-success-bar"><div className="login-success-fill"></div></div>
      </div>
    </div>
  )

  return (
    <div className="login-page">
      <div className="login-top-controls">
        <button type="button" className="login-back-home" onClick={() => navigate('/')} title="Back to home">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M11.5 7H2.5M6 3L2.5 7 6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Home
        </button>
        <div className="login-controls-right">
          <ZoomControl zoom={zoom} setZoom={setZoom} />
          <button type="button" className="login-theme-toggle" onClick={toggle} title="Toggle theme">
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Left panel — always visible */}
      <div className="login-left">
        <div className="login-left-glow1"></div>
        <div className="login-left-glow2"></div>
        <div className="login-left-top">
          <div className="login-brand">
            <div className="login-brand-icon">
              <img src="/logo.png" alt="InStore Optima" style={{ height: 50 }} />
            </div>
          </div>
          <div className="login-left-headline">
            Smart inventory.<br/><span>Zero stockouts.</span>
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
            'Two-factor authentication',
          ].map(f => (
            <div key={f} className="login-feature-row">
              <div className="login-feature-check"><i className="bi bi-check-lg"></i></div>
              <span>{f}</span>
            </div>
          ))}
        </div>
        <div className="login-left-footer">© 2026 InStore Optima</div>
      </div>

      {/* Right panel — card changes based on step */}
      <div className="login-right">
        <div className="login-right-grid"></div>
        <div className="login-right-glow"></div>
        <div className="login-card">

          {step === 'credentials' && (
            <>
              <div className="login-card-icon">
                <img src="/logo-1.png" alt="InStore Optima" style={{ height: 56, objectFit: 'contain' }} />
              </div>
              <h1 className="login-card-title">Welcome back</h1>
              <p className="login-card-sub">Sign in to your account</p>
              {backMsg && (
                <div className="login-alert-error" style={{ marginBottom: 12 }}>
                  <i className="bi bi-shield-exclamation"></i>{backMsg}
                </div>
              )}
              <CredentialsStep
                onOtpSent={handleOtpSent}
                dark={dark} toggle={toggle}
                zoom={zoom} setZoom={setZoom}
                navigate={navigate}
              />
            </>
          )}

          {step === 'otp' && (
            <OtpStep
              sessionKey={sessionKey}
              maskedEmail={maskedEmail}
              onSuccess={handleOtpSuccess}
              onBack={handleBack}
            />
          )}

        </div>
      </div>
    </div>
  )
}
