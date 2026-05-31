import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { forgotPasswordApi, resetPasswordApi, resendOtpApi } from '../services/authService'
import { validateField, parseApiError } from '../utils/validators'
import ZoomControl from '../components/ZoomControl'

const OTP_EXPIRY_SEC  = 3 * 60
const RESEND_COOLDOWN = 60

// ── Step 1: Email ─────────────────────────────────────────────────────────────
function EmailStep({ onOtpSent }) {
  const [email, setEmail]   = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    const err = validateField('email', email)
    if (err) return setError(err)
    setLoading(true)
    try {
      const res = await forgotPasswordApi({ email })
      onOtpSent(res.data.sessionKey, res.data.maskedEmail, email)
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(124,58,237,.12)', border: '1.5px solid rgba(124,58,237,.35)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
          <i className="bi bi-key-fill" style={{ fontSize: 22, color: '#a78bfa' }}></i>
        </div>
        <h1 className="login-card-title" style={{ marginBottom: 4 }}>Reset password</h1>
        <p className="login-card-sub" style={{ marginBottom: 0 }}>Enter your email and we'll send a reset code</p>
      </div>

      {error && (
        <div className="login-alert-error"><i className="bi bi-exclamation-circle"></i>{error}</div>
      )}

      <div className="login-field">
        <label className="form-label-custom">Email address</label>
        <div className="login-input-wrap">
          <i className="bi bi-envelope login-input-icon"></i>
          <input
            className="form-control-custom login-input"
            type="text"
            placeholder="you@company.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoComplete="email"
          />
        </div>
      </div>

      <button className="login-submit" type="button" onClick={handleSubmit} disabled={loading}>
        {loading
          ? <><i className="bi bi-hourglass-split"></i> Sending code...</>
          : <>Send reset code <i className="bi bi-arrow-right"></i></>}
      </button>

      <p className="login-footer-text">
        Remembered it?{' '}
        <Link to="/login" className="login-link">Back to sign in</Link>
      </p>
    </>
  )
}

// ── Step 2: OTP ───────────────────────────────────────────────────────────────
function OtpStep({ sessionKey: initKey, maskedEmail, onVerified, onBack }) {
  const [digits, setDigits]         = useState(['', '', '', '', '', ''])
  const [sessionKey, setSessionKey] = useState(initKey)
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [resendCd, setResendCd]     = useState(RESEND_COOLDOWN)
  const [expiry, setExpiry]         = useState(OTP_EXPIRY_SEC)
  const inputRefs = useRef([])

  useEffect(() => {
    const cd = setInterval(() => setResendCd(s => Math.max(0, s - 1)), 1000)
    const ex = setInterval(() => setExpiry(s => Math.max(0, s - 1)), 1000)
    return () => { clearInterval(cd); clearInterval(ex) }
  }, [])

  const fmt = sec => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`

  const handleDigit = (i, value) => {
    if (!/^\d?$/.test(value)) return
    const next = [...digits]; next[i] = value.slice(-1)
    setDigits(next); setError('')
    if (value && i < 5) inputRefs.current[i + 1]?.focus()
    if (value && i === 5 && next.join('').length === 6) handleVerify(next.join(''))
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputRefs.current[i - 1]?.focus()
    if (e.key === 'ArrowLeft'  && i > 0) inputRefs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) inputRefs.current[i + 1]?.focus()
  }

  const handlePaste = e => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    const next = pasted.padEnd(6, '').slice(0, 6).split('')
    setDigits(next)
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
    if (pasted.length === 6) handleVerify(pasted)
  }

  const handleVerify = useCallback(async (otp) => {
    const code = otp ?? digits.join('')
    if (code.length < 6) return setError('Please enter all 6 digits.')
    setLoading(true); setError('')
    try {
      onVerified(sessionKey, code)
    } finally {
      setLoading(false)
    }
  }, [digits, sessionKey, onVerified])

  const handleResend = async () => {
    if (resendCd > 0) return
    try {
      const res = await resendOtpApi({ sessionKey })
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
      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(124,58,237,.12)', border: '1.5px solid rgba(124,58,237,.35)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
          <i className="bi bi-envelope-check-fill" style={{ fontSize: 22, color: '#a78bfa' }}></i>
        </div>
        <h1 className="login-card-title" style={{ marginBottom: 4 }}>Check your email</h1>
        <p className="login-card-sub" style={{ marginBottom: 0 }}>
          Code sent to <strong style={{ color: '#e2e8f0' }}>{maskedEmail}</strong>
        </p>
      </div>

      {error && (
        <div className="login-alert-error" style={{ marginTop: 14 }}>
          <i className="bi bi-exclamation-circle"></i>{error}
        </div>
      )}

      <div className="otp-boxes" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input key={i} ref={el => inputRefs.current[i] = el}
            className={`otp-box${d ? ' otp-filled' : ''}`}
            type="text" inputMode="numeric" maxLength={1} value={d}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            autoFocus={i === 0} autoComplete="one-time-code" />
        ))}
      </div>

      <p className="otp-meta">
        {expiry > 0
          ? <>Code expires in <strong>{fmt(expiry)}</strong></>
          : <span style={{ color: '#f87171' }}>Code expired — please resend</span>}
      </p>

      <button className="login-submit" type="button"
        onClick={() => handleVerify(otp)} disabled={loading || otp.length < 6}>
        {loading
          ? <><i className="bi bi-hourglass-split"></i> Verifying...</>
          : <>Continue <i className="bi bi-arrow-right"></i></>}
      </button>

      <div className="otp-resend-row" style={{ marginTop: 16 }}>
        <button type="button" className="otp-back-btn" onClick={onBack}>
          <i className="bi bi-arrow-left"></i> Back
        </button>
        <span style={{ color: '#334155' }}>·</span>
        <button type="button" className="otp-resend-btn" disabled={resendCd > 0} onClick={handleResend}>
          {resendCd > 0 ? `Resend in ${resendCd}s` : 'Resend code'}
        </button>
      </div>
    </>
  )
}

// ── Step 3: New Password ──────────────────────────────────────────────────────
function NewPasswordStep({ sessionKey, otp, onSuccess, onBack }) {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPwd, setShowPwd]     = useState(false)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  const handleSubmit = async () => {
    const err = validateField('password', password)
    if (err) return setError(err)
    if (password !== confirm) return setError('Passwords do not match.')
    setLoading(true); setError('')
    try {
      await resetPasswordApi({ sessionKey, otp, newPassword: password })
      onSuccess()
    } catch (err) {
      setError(parseApiError(err))
      // OTP might be wrong — go back to OTP step
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(16,185,129,.12)', border: '1.5px solid rgba(16,185,129,.35)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
          <i className="bi bi-lock-fill" style={{ fontSize: 22, color: '#34d399' }}></i>
        </div>
        <h1 className="login-card-title" style={{ marginBottom: 4 }}>New password</h1>
        <p className="login-card-sub" style={{ marginBottom: 0 }}>Choose a strong password for your account</p>
      </div>

      {error && (
        <div className="login-alert-error"><i className="bi bi-exclamation-circle"></i>{error}</div>
      )}

      <div className="login-field">
        <label className="form-label-custom">New password</label>
        <div className="login-input-wrap">
          <i className="bi bi-lock login-input-icon"></i>
          <input className="form-control-custom login-input"
            type={showPwd ? 'text' : 'password'} placeholder="••••••••"
            value={password} onChange={e => { setPassword(e.target.value); setError('') }} />
          <button type="button" className="password-toggle-btn" onClick={() => setShowPwd(p => !p)} tabIndex={-1}>
            <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`}></i>
          </button>
        </div>
        <span className="field-hint-text">Uppercase, lowercase, and a number (min 6 chars).</span>
      </div>

      <div className="login-field">
        <label className="form-label-custom">Confirm password</label>
        <div className="login-input-wrap">
          <i className="bi bi-lock-fill login-input-icon"></i>
          <input className="form-control-custom login-input"
            type={showPwd ? 'text' : 'password'} placeholder="••••••••"
            value={confirm} onChange={e => { setConfirm(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>
      </div>

      <button className="login-submit" type="button" onClick={handleSubmit} disabled={loading}>
        {loading
          ? <><i className="bi bi-hourglass-split"></i> Saving...</>
          : <>Set new password <i className="bi bi-check-lg"></i></>}
      </button>

      <p className="login-footer-text" style={{ textAlign: 'center', marginTop: 12 }}>
        <button type="button" className="otp-back-btn" onClick={onBack}>
          <i className="bi bi-arrow-left"></i> Back
        </button>
      </p>
    </>
  )
}

// ── Main ForgotPassword page ───────────────────────────────────────────────────
export default function ForgotPassword({ zoom = 100, setZoom = () => {} }) {
  const navigate       = useNavigate()
  const { dark, toggle } = useTheme()

  const [step, setStep]             = useState('email')
  const [sessionKey, setSessionKey] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [verifiedOtp, setVerifiedOtp] = useState('')
  const [done, setDone]             = useState(false)

  if (done) return (
    <div className="login-success-screen">
      <div className="login-success-inner">
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
        <div className="login-success-title">Password reset!</div>
        <div className="login-success-sub">You can now sign in with your new password.</div>
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

      <div className="login-left">
        <div className="login-left-glow1"></div>
        <div className="login-left-glow2"></div>
        <div className="login-left-top">
          <div className="login-brand">
            <div className="login-brand-icon"><img src="/logo.png" alt="InStore Optima" style={{ height: 50 }} /></div>
          </div>
          <div className="login-left-headline">
            Secure account.<br/><span>Your data safe.</span>
          </div>
          <div className="login-left-sub">
            Reset your password securely. A one-time code will be sent to your registered email.
          </div>
        </div>
        <div className="login-features">
          {['Email OTP verification', 'Secure password reset', 'Account protection', 'Two-factor authentication'].map(f => (
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
          {step === 'email' && (
            <EmailStep onOtpSent={(sk, me) => { setSessionKey(sk); setMaskedEmail(me); setStep('otp') }} />
          )}
          {step === 'otp' && (
            <OtpStep
              sessionKey={sessionKey}
              maskedEmail={maskedEmail}
              onVerified={(sk, code) => { setSessionKey(sk); setVerifiedOtp(code); setStep('password') }}
              onBack={() => setStep('email')}
            />
          )}
          {step === 'password' && (
            <NewPasswordStep
              sessionKey={sessionKey}
              otp={verifiedOtp}
              onSuccess={() => { setDone(true); setTimeout(() => navigate('/login'), 2200) }}
              onBack={() => setStep('otp')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
