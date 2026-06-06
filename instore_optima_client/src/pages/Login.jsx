// =============================================================================
// Login.jsx
// =============================================================================
// This is the main authentication page for InStore Optima.
// It is split into two steps:
//   1. CredentialsStep — user enters email + password.
//   2. OtpStep        — user enters a 6-digit code (email OTP or TOTP from
//                        an authenticator app) to complete two-factor login.
//
// After a successful verification the user is stored in AuthContext and the
// app navigates them to /dashboard.
// =============================================================================

// React hooks used across this file
import { useState, useEffect, useRef, useCallback } from 'react'
// useNavigate lets us programmatically send the user to another route;
// Link renders an <a> tag that works with React Router.
import { useNavigate, Link } from 'react-router-dom'
// AuthContext exposes the login() helper that persists the JWT token.
import { useAuth } from '../context/AuthContext'
// ThemeContext gives us the current dark/light mode and a toggle function.
import { useTheme } from '../context/ThemeContext'
// API helpers — each wraps an Axios call to the backend auth endpoints.
import { loginApi, verifyOtpApi, resendOtpApi, switchToEmailOtpApi } from '../services/authService'
// validateField checks a single form field; parseApiError extracts a
// human-readable message from an Axios error response.
import { validateField, parseApiError } from '../utils/validators'
// Reusable UI components shared with other pages.
import ZoomControl from '../components/ZoomControl'
import ContactSupportModal from '../components/ContactSupportModal'

// How long (in seconds) an email OTP is valid before it expires.
const OTP_EXPIRY_SEC  = 3 * 60    // 3 minutes (matches backend)
// How many seconds the user must wait before they can request a new OTP.
const RESEND_COOLDOWN = 60         // 60s before Resend is enabled again

// ── Credentials step ──────────────────────────────────────────────────────────
// Renders the email + password form. On success it calls onOtpSent() so the
// parent (Login) can advance to the OTP step.
function CredentialsStep({ onOtpSent, dark, toggle, zoom, setZoom, navigate }) {
  // form holds the current values of the email and password inputs.
  const [form, setForm]               = useState({ email: '', password: '' })
  // fieldErrors stores per-field validation messages (e.g. "Email is invalid").
  const [fieldErrors, setFieldErrors] = useState({})
  // error is a top-level API error (e.g. "Invalid credentials").
  const [error, setError]             = useState('')
  // loading becomes true while waiting for the API call to respond.
  const [loading, setLoading]         = useState(false)
  // showPassword toggles the password input between text and ••• mode.
  const [showPassword, setShowPassword] = useState(false)
  // touched tracks which fields the user has interacted with so we only
  // show validation errors after they've visited a field.
  const [touched, setTouched]         = useState({})

  // Returns a change handler for the given field name.
  // If the field was already touched, re-validates on every keystroke.
  const handleChange = field => e => {
    const value = e.target.value
    setForm(f => ({ ...f, [field]: value }))
    if (touched[field]) setFieldErrors(p => ({ ...p, [field]: validateField(field, value) }))
    if (error) setError('')
  }
  // Returns a blur handler — marks the field as touched and validates it
  // when the user leaves the input for the first time.
  const handleBlur = field => () => {
    setTouched(p => ({ ...p, [field]: true }))
    setFieldErrors(p => ({ ...p, [field]: validateField(field, form[field]) }))
  }

  // Called when the user clicks "Continue" or presses Enter.
  // Validates both fields before hitting the backend.
  const handleSubmit = async () => {
    setError('')
    // Run client-side validation before making a network request.
    const emailErr = validateField('email', form.email)
    const passErr  = form.password ? '' : 'Password is required.'
    setFieldErrors({ email: emailErr, password: passErr })
    setTouched({ email: true, password: true })
    if (emailErr || passErr) return

    setLoading(true)
    try {
      // POST credentials to the backend. On success the server issues a
      // short-lived session key and (if TOTP is off) sends an email OTP.
      const res = await loginApi(form)
      const { sessionKey, maskedEmail, isTotpChallenge } = res.data
      // Hand off to the parent so it can switch to the OTP step.
      onOtpSent(sessionKey, maskedEmail, !!isTotpChallenge)
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label className="form-label-custom" style={{ margin: 0 }}>Password</label>
          <Link to="/forgot-password" className="login-link" style={{ fontSize: 11.5 }}>Forgot password?</Link>
        </div>
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

// After this many wrong OTP submissions the user is sent back to step 1.
const MAX_ATTEMPTS = 3

// ── OTP step ──────────────────────────────────────────────────────────────────
// Renders six individual digit boxes and handles both email OTP and TOTP
// (authenticator app) verification flows.
function OtpStep({ sessionKey: initialSessionKey, maskedEmail, isTotpChallenge: initialIsTotp, onSuccess, onBack, onSwitchToEmail }) {
  // digits is an array of 6 single-character strings, one per input box.
  const [digits, setDigits]         = useState(['', '', '', '', '', ''])
  // sessionKey is a server-issued token that links this OTP challenge to
  // the credentials the user entered in step 1. It may change on resend.
  const [sessionKey, setSessionKey] = useState(initialSessionKey)
  // When true the user must use their authenticator app instead of email.
  const [isTotpChallenge, setIsTotpChallenge] = useState(initialIsTotp)
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  // switching is true while the "Use email OTP instead" request is in-flight.
  const [switching, setSwitching]   = useState(false)
  const [resendCd, setResendCd]     = useState(0)          // 0 = immediately available
  const [expiry, setExpiry]         = useState(OTP_EXPIRY_SEC)
  const [attempts, setAttempts]     = useState(0)   // wrong-OTP counter
  const [totpWindow, setTotpWindow] = useState(0)   // seconds left in current TOTP 30s window
  // inputRefs lets us programmatically focus individual digit boxes (e.g.
  // on auto-advance or when clearing after a wrong code).
  const inputRefs = useRef([])

  // Countdown timers
  // Three independent 1-second intervals run simultaneously:
  //   cd — counts down the resend cooldown
  //   ex — counts down the OTP expiry time
  //   tw — tracks how many seconds remain in the current 30-second TOTP window
  useEffect(() => {
    const tick = () => {
      const nowSec = Math.floor(Date.now() / 1000)
      setTotpWindow(30 - (nowSec % 30))
    }
    tick()
    const cd = setInterval(() => setResendCd(s => Math.max(0, s - 1)), 1000)
    const ex = setInterval(() => setExpiry(s => Math.max(0, s - 1)), 1000)
    const tw = setInterval(tick, 1000)
    // Clean up all three intervals when the component unmounts.
    return () => { clearInterval(cd); clearInterval(ex); clearInterval(tw) }
  }, [])

  // Converts a number of seconds into a "MM:SS" string for display.
  const fmt = sec => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`

  // Called whenever a digit box value changes.
  // Rejects non-numeric input, advances focus to the next box, and
  // auto-submits the form as soon as all 6 digits are filled.
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

  // Keyboard navigation: Backspace moves focus left; arrow keys move between boxes.
  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && i > 0)  inputRefs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) inputRefs.current[i + 1]?.focus()
  }

  // Allows the user to paste a full 6-digit code (e.g. from a password
  // manager), strips non-digits, fills all boxes, and auto-submits.
  const handlePaste = e => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    const next = [...pasted.padEnd(6, '').slice(0, 6).split('')]
    setDigits(next)
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
    if (pasted.length === 6) handleVerify(pasted)
  }

  // Sends the assembled 6-digit code to the backend for verification.
  // useCallback memoises this function so it is stable between renders —
  // important because it is called from the auto-submit path in handleDigit.
  const handleVerify = useCallback(async (otp) => {
    // otp may be passed directly (auto-submit) or assembled from state.
    const code = otp ?? digits.join('')
    if (code.length < 6) { setError('Please enter all 6 digits.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await verifyOtpApi({ sessionKey, otp: code })
      // On success the backend returns a signed JWT and the user's profile.
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

  // Asks the backend to issue a fresh OTP and resets all timers.
  // The guard at the top prevents hammering before the cooldown expires.
  const handleResend = async () => {
    if (resendCd > 0) return
    try {
      const res = await resendOtpApi({ sessionKey })
      // The server returns a new sessionKey bound to the fresh OTP.
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

  // Lets the user abandon TOTP and fall back to email OTP instead.
  // The backend generates a new session key and sends a code by email.
  const handleSwitchToEmail = async () => {
    setSwitching(true); setError('')
    try {
      const res = await switchToEmailOtpApi({ sessionKey })
      setSessionKey(res.data.sessionKey)
      setIsTotpChallenge(false)
      setResendCd(0)
      setExpiry(OTP_EXPIRY_SEC)
      setDigits(['', '', '', '', '', ''])
      // Inform the parent so it can update the maskedEmail shown in the UI.
      if (onSwitchToEmail) onSwitchToEmail(res.data.maskedEmail)
      // Small delay so the DOM has time to render before we steal focus.
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setSwitching(false)
    }
  }

  const otp = digits.join('')

  return (
    <>
      {/* Shield icon */}
      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: isTotpChallenge ? 'rgba(124,58,237,.12)' : 'rgba(8,145,178,.12)', border: `1.5px solid ${isTotpChallenge ? 'rgba(124,58,237,.35)' : 'rgba(8,145,178,.35)'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
          <i className={`bi ${isTotpChallenge ? 'bi-phone-fill' : 'bi-shield-lock-fill'}`} style={{ fontSize: 22, color: isTotpChallenge ? '#a78bfa' : '#22d3ee' }}></i>
        </div>
        <h1 className="login-card-title" style={{ marginBottom: 4 }}>Verify your identity</h1>
        <p className="login-card-sub" style={{ marginBottom: 0 }}>
          {isTotpChallenge
            ? 'Open your authenticator app and enter the 6-digit code'
            : <>A 6-digit code was sent to <strong style={{ color: '#e2e8f0' }}>{maskedEmail}</strong></>}
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

      {/* Timer line — different for TOTP vs email OTP */}
      <p className="otp-meta">
        {isTotpChallenge ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span style={{ display: 'inline-block', width: 28, height: 28, borderRadius: '50%', border: `2.5px solid ${totpWindow <= 5 ? '#f87171' : '#22d3ee'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: totpWindow <= 5 ? '#f87171' : '#22d3ee', transition: 'border-color .3s, color .3s' }}>
              {totpWindow}
            </span>
            <span style={{ color: totpWindow <= 5 ? '#f87171' : undefined }}>
              {totpWindow <= 5 ? 'Code changing soon — enter it now' : 'Current code changes in ' + totpWindow + 's'}
            </span>
          </span>
        ) : (
          expiry > 0
            ? <>Code expires in <strong>{fmt(expiry)}</strong></>
            : <span style={{ color: '#f87171' }}>Code expired — please resend or go back</span>
        )}
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

      {/* Bottom action row */}
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Resend / switch row */}
        <div className="otp-resend-row">
          {isTotpChallenge ? (
            /* TOTP mode — offer to switch to email OTP */
            <button
              type="button"
              className="otp-resend-btn"
              onClick={handleSwitchToEmail}
              disabled={switching}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {switching
                ? <><i className="bi bi-hourglass-split"></i> Sending code...</>
                : <><i className="bi bi-envelope"></i> Use email OTP instead</>}
            </button>
          ) : (
            /* Email OTP mode — resend */
            <button
              type="button"
              className="otp-resend-btn"
              disabled={resendCd > 0}
              onClick={handleResend}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="bi bi-arrow-clockwise"></i>
              {resendCd > 0 ? `Resend in ${resendCd}s` : 'Resend code'}
            </button>
          )}
        </div>

        {/* Back to login */}
        <div style={{ textAlign: 'center' }}>
          <button type="button" className="otp-back-btn" onClick={onBack}>
            <i className="bi bi-arrow-left"></i> Back to login
          </button>
        </div>
      </div>
    </>
  )
}

// ── Main Login component ──────────────────────────────────────────────────────
// This is the page-level component. It owns the two-step login state machine
// and renders the left marketing panel plus the right card that swaps between
// CredentialsStep and OtpStep.
export default function Login({ zoom = 100, setZoom = () => {} }) {
  const { login }         = useAuth()
  const { dark, toggle }  = useTheme()
  const navigate          = useNavigate()

  // step drives which sub-component is rendered inside the card.
  // 'credentials' | 'otp'
  const [step, setStep]                   = useState('credentials')
  // sessionKey and maskedEmail are received from the backend after credentials
  // are accepted and are passed down to OtpStep.
  const [sessionKey, setSessionKey]       = useState('')
  const [maskedEmail, setMaskedEmail]     = useState('')
  // When true OtpStep shows the TOTP (authenticator app) flow.
  const [isTotpChallenge, setIsTotpChallenge] = useState(false)
  // success triggers the animated "Welcome back" splash before redirecting.
  const [success, setSuccess]             = useState(false)
  // backMsg carries an optional error to show when the user is sent back to
  // the credentials step (e.g. after too many wrong codes).
  const [backMsg, setBackMsg]             = useState('')
  const [supportOpen, setSupportOpen]     = useState(false)

  // Called when user switches from TOTP to email OTP mid-step
  // Updates parent state so the new masked email address is shown.
  const handleSwitchedToEmail = (newMasked) => {
    setIsTotpChallenge(false)
    if (newMasked) setMaskedEmail(newMasked)
  }

  useEffect(() => { /* reset on mount */ }, [])

  // Called by CredentialsStep once the backend accepts the credentials and
  // returns a session key. Moves the wizard to the OTP step.
  const handleOtpSent = (sk, me, isTotp = false) => {
    setSessionKey(sk)
    setMaskedEmail(me)
    setIsTotpChallenge(isTotp)
    setBackMsg('')
    setStep('otp')
  }

  // Called by OtpStep after the code is verified. Saves the token in context
  // and shows the success screen before navigating away.
  const handleOtpSuccess = (token, userData) => {
    login(token, userData)
    setSuccess(true)
    // Short delay so the user sees the welcome animation.
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
              isTotpChallenge={isTotpChallenge}
              onSuccess={handleOtpSuccess}
              onBack={handleBack}
              onSwitchToEmail={handleSwitchedToEmail}
            />
          )}

        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 16, right: 24 }}>
        <button
          type="button"
          onClick={() => setSupportOpen(true)}
          style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--text-600, #64748b)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="bi bi-headset"></i> Contact Support
        </button>
      </div>

      <ContactSupportModal show={supportOpen} onHide={() => setSupportOpen(false)} />
    </div>
  )
}
