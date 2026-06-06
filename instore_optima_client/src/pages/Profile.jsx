// Profile.jsx
// This page lets the logged-in user manage their account in one place:
//   • View and edit personal info (name, phone, address)
//   • Change their password
//   • Enable or disable TOTP (Time-based One-Time Password) authenticator 2FA
//   • Open a support contact form
// All data is fetched from the API on mount and written back through the same API.

// ── Imports ────────────────────────────────────────────────────────────────────
// React hooks for component state and lifecycle
import { useState, useEffect } from 'react'
// AuthContext provides the currently logged-in user object
import { useAuth } from '../context/AuthContext'
// authService functions covering profile CRUD, password change, and TOTP setup/enable/disable
import {
  getProfileApi, updateProfileApi,
  changePasswordApi, totpSetupApi, totpEnableApi, totpDisableApi
} from '../services/authService'
// parseApiError: turns an API error response into a readable string
// validateField: field-level validation rules (e.g. password strength, required name)
import { parseApiError, validateField } from '../utils/validators'
// QRCodeSVG renders an SVG QR code the user scans with their authenticator app
import { QRCodeSVG } from 'qrcode.react'
// Shared layout and modal components
import PageHeader from '../components/shared/PageHeader'
import ContactSupportModal from '../components/ContactSupportModal'

export default function Profile() {
  // ── Context ──────────────────────────────────────────────────────────────────
  // user is from AuthContext — used only to pre-fill the support modal (name/email)
  const { user } = useAuth()

  // ── State: profile data & support modal ──────────────────────────────────────
  // profile: the full profile object returned by the API (null while loading)
  const [profile, setProfile]             = useState(null)
  const [loadErr, setLoadErr]             = useState('')
  const [supportOpen, setSupportOpen]     = useState(false)

  // Edit state
  const [editMode, setEditMode]           = useState(false)
  const [editForm, setEditForm]           = useState({ name: '', phoneNumber: '', address: '' })
  const [editErr, setEditErr]             = useState('')
  const [editSuccess, setEditSuccess]     = useState('')
  const [editLoading, setEditLoading]     = useState(false)

  // Change password
  const [cpForm, setCpForm]               = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [cpError, setCpError]             = useState('')
  const [cpSuccess, setCpSuccess]         = useState('')
  const [cpLoading, setCpLoading]         = useState(false)
  // showCp toggles visibility of the password change form (collapsed by default)
  const [showCp, setShowCp]               = useState(false)
  // showPwd toggles between text and password input type for the new password field
  const [showPwd, setShowPwd]             = useState(false)

  // TOTP
  // totpSetup holds the QR code URI and manual key returned by the setup API; null = not in setup flow
  const [totpSetup, setTotpSetup]         = useState(null)
  // totpCode is the 6-digit code the user types after scanning the QR code
  const [totpCode, setTotpCode]           = useState('')
  const [totpError, setTotpError]         = useState('')
  const [totpSuccess, setTotpSuccess]     = useState('')
  const [totpLoading, setTotpLoading]     = useState(false)
  // disablePwd: password entered to confirm disabling TOTP
  const [disablePwd, setDisablePwd]       = useState('')
  // showDisable: whether the "confirm disable" password input is visible
  const [showDisable, setShowDisable]     = useState(false)

  // ── Side effects ─────────────────────────────────────────────────────────────
  // Fetch the user's profile once on mount and seed the edit form with the current values
  useEffect(() => {
    getProfileApi()
      .then(r => {
        setProfile(r.data)
        setEditForm({ name: r.data.name || '', phoneNumber: r.data.phoneNumber || '', address: r.data.address || '' })
      })
      .catch(e => setLoadErr(parseApiError(e)))
  }, [])

  // refreshProfile is called after TOTP enable/disable to pick up the updated totpEnabled flag
  const refreshProfile = () =>
    getProfileApi().then(r => {
      setProfile(r.data)
      setEditForm({ name: r.data.name || '', phoneNumber: r.data.phoneNumber || '', address: r.data.address || '' })
    }).catch(() => {})

  // ── Handlers ─────────────────────────────────────────────────────────────────
  // Validate the name field first, then PATCH the profile. Clears edit mode on success.
  const handleEditSave = async () => {
    const nameErr = validateField('name', editForm.name)
    if (nameErr) return setEditErr(nameErr)
    setEditLoading(true); setEditErr(''); setEditSuccess('')
    try {
      const r = await updateProfileApi(editForm)
      setProfile(r.data)
      setEditSuccess('Profile updated!')
      setEditMode(false)
      setTimeout(() => setEditSuccess(''), 3000)
    } catch (e) { setEditErr(parseApiError(e)) }
    finally { setEditLoading(false) }
  }

  // Validate all three password fields before calling the API.
  // On success the form is hidden and a success banner is shown briefly.
  const handleChangePassword = async () => {
    const err = validateField('password', cpForm.newPassword)
    if (!cpForm.currentPassword) return setCpError('Enter your current password.')
    if (err) return setCpError(err)
    if (cpForm.newPassword !== cpForm.confirm) return setCpError('Passwords do not match.')
    setCpLoading(true); setCpError(''); setCpSuccess('')
    try {
      await changePasswordApi({ currentPassword: cpForm.currentPassword, newPassword: cpForm.newPassword })
      setCpSuccess('Password updated successfully.')
      setCpForm({ currentPassword: '', newPassword: '', confirm: '' })
      setShowCp(false)
    } catch (e) { setCpError(parseApiError(e)) }
    finally { setCpLoading(false) }
  }

  // Step 1 of TOTP setup: call the API to generate a secret, QR code URI, and manual key.
  // The returned data is stored in totpSetup to render the QR code and manual entry box.
  const handleTotpSetup = async () => {
    setTotpLoading(true); setTotpError('')
    try { const r = await totpSetupApi(); setTotpSetup(r.data); setTotpCode('') }
    catch (e) { setTotpError(parseApiError(e)) }
    finally { setTotpLoading(false) }
  }

  // Step 2 of TOTP setup: the user scanned the QR code and typed the 6-digit code.
  // We verify it with the server using the same secret. On success TOTP is active.
  const handleTotpEnable = async () => {
    if (totpCode.length !== 6) return setTotpError('Enter the 6-digit code from your app.')
    setTotpLoading(true); setTotpError('')
    try {
      await totpEnableApi({ secret: totpSetup.secret, code: totpCode })
      setTotpSuccess('Authenticator app enabled!')
      setTotpSetup(null); setTotpCode('')
      await refreshProfile()
    } catch (e) { setTotpError(parseApiError(e)) }
    finally { setTotpLoading(false) }
  }

  // Disable TOTP: requires the user's current password as an extra security check.
  // After disabling, the profile is refreshed so the UI switches back to "Email OTP" mode.
  const handleTotpDisable = async () => {
    if (!disablePwd) return setTotpError('Enter your password to confirm.')
    setTotpLoading(true); setTotpError('')
    try {
      await totpDisableApi({ password: disablePwd })
      setTotpSuccess('Authenticator app disabled.')
      setDisablePwd(''); setShowDisable(false)
      await refreshProfile()
    } catch (e) { setTotpError(parseApiError(e)) }
    finally { setTotpLoading(false) }
  }

  // roleColors maps each user role to a set of badge colours for the avatar banner.
  // The fallback (last line) handles any unexpected role value gracefully.
  const roleColors = {
    Admin:   { bg: 'rgba(139,92,246,.15)', color: '#a78bfa', border: 'rgba(139,92,246,.3)' },
    Manager: { bg: 'rgba(8,145,178,.15)',  color: '#22d3ee', border: 'rgba(8,145,178,.3)'  },
    Staff:   { bg: 'rgba(16,185,129,.15)', color: '#34d399', border: 'rgba(16,185,129,.3)' },
  }
  // rc: the colour set for the current user's role (used throughout the avatar section)
  const rc = roleColors[profile?.role] || { bg: 'rgba(255,255,255,.06)', color: 'var(--text-400)', border: 'var(--border)' }

  // ── Early-return guards ───────────────────────────────────────────────────────
  // Show an error message if the initial profile fetch failed (e.g. network error)
  if (loadErr) return (
    <div className="animate-in" style={{ padding: '28px 28px 48px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <PageHeader title="My Profile" subtitle="Account settings and security" />
        <div style={{ color: '#f87171', padding: 24 }}>{loadErr}</div>
      </div>
    </div>
  )
  // Show a loading placeholder while waiting for the API response
  if (!profile) return (
    <div className="animate-in" style={{ padding: '28px 28px 48px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <PageHeader title="My Profile" subtitle="Account settings and security" />
        <div style={{ padding: 24, color: 'var(--text-600)', fontSize: 13 }}>Loading...</div>
      </div>
    </div>
  )

  // Local date formatter: converts an ISO date string to "DD Mon YYYY" (e.g. "03 Jun 2026")
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  return (
    <div className="animate-in" style={{ padding: '28px 28px 48px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
      <PageHeader title="My Profile" subtitle="Account settings and security" />

      {/* ── Account Information ──────────────────────────────────────────────── */}
      <div className="table-card" style={{ marginBottom: 16 }}>
        {/* Toolbar */}
        <div className="table-toolbar">
          <p className="table-toolbar-title">Account Information</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {editSuccess && (
              <span style={{ fontSize: 12, color: '#34d399', display: 'flex', alignItems: 'center', gap: 5 }}>
                <i className="bi bi-check-circle-fill"></i>{editSuccess}
              </span>
            )}
            {!editMode ? (
              <button onClick={() => { setEditMode(true); setEditErr('') }}
                className="btn-secondary-custom"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, padding: '5px 14px', borderRadius: 7, cursor: 'pointer', fontWeight: 500 }}>
                <i className="bi bi-pencil-square"></i>Edit profile
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setEditMode(false); setEditErr(''); setEditForm({ name: profile.name || '', phoneNumber: profile.phoneNumber || '', address: profile.address || '' }) }}
                  className="btn-secondary-custom"
                  style={{ fontSize: 12.5, padding: '5px 12px', borderRadius: 7, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleEditSave} disabled={editLoading}
                  style={{ padding: '5px 16px', background: '#0891b2', border: 'none', borderRadius: 7, fontSize: 12.5, color: '#fff', cursor: editLoading ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: editLoading ? .7 : 1 }}>
                  {editLoading ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* ── Avatar banner ─────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 18, marginBottom: 18, borderBottom: '1px solid var(--border)' }}>
            {/* Avatar */}
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--cyan-muted)', border: '2px solid var(--cyan-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: 'var(--cyan-light)', flexShrink: 0, letterSpacing: -.5 }}>
              {profile.name?.charAt(0).toUpperCase()}
            </div>
            {/* Name + role */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-200)', marginBottom: 5, lineHeight: 1 }}>{profile.name}</div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: .03 }}>
                <i className="bi bi-person-fill" style={{ fontSize: 10 }}></i>{profile.role}
              </span>
            </div>
            {/* ID + joined */}
            <div style={{ display: 'flex', gap: 24, flexShrink: 0 }}>
              {[
                { label: 'User ID', value: <span className="text-accent" style={{ fontWeight: 700, fontSize: 14 }}>#{profile.userId}</span> },
                { label: 'Joined',  value: <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-200)' }}>{fmtDate(profile.createdAt)}</span> },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-700)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 3 }}>{label}</div>
                  {value}
                </div>
              ))}
            </div>
          </div>

          {editErr && (
            <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', color: '#f87171', borderRadius: 8, padding: '9px 14px', fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bi bi-exclamation-circle-fill"></i>{editErr}
            </div>
          )}

          {!editMode ? (
            /* ── View mode ─────────────────────────────────────────── */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 20px' }}>
              {[
                { icon: 'bi-person',       label: 'Full Name',    value: profile.name },
                { icon: 'bi-envelope',     label: 'Email',        value: profile.email },
                { icon: 'bi-shield-check', label: '2FA Method',   value: profile.totpEnabled ? 'Authenticator App' : 'Email OTP' },
                { icon: 'bi-telephone',    label: 'Phone',        value: profile.phoneNumber || '—' },
                { icon: 'bi-geo-alt',      label: 'Address',      value: profile.address     || '—' },
              ].map(({ icon, label, value }) => (
                <div key={label} style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <i className={`bi ${icon}`} style={{ fontSize: 11, color: 'var(--cyan-light)' }}></i>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-600)', textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: value === '—' ? 'var(--text-700)' : 'var(--text-200)', lineHeight: 1.4 }}>{value}</div>
                </div>
              ))}
            </div>
          ) : (
            /* ── Edit mode ─────────────────────────────────────────── */
            <div style={{ maxWidth: 680 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { key: 'name',        label: 'Full Name',    icon: 'bi-person',    ph: 'Your full name',    type: 'text' },
                { key: 'phoneNumber', label: 'Phone Number', icon: 'bi-telephone', ph: '+91 98765 43210',   type: 'tel' },
              ].map(({ key, label, icon, ph, type }) => (
                <div key={key}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--text-400)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    <i className={`bi ${icon}`} style={{ color: 'var(--cyan-light)', fontSize: 11 }}></i>{label}
                  </label>
                  <input type={type}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-200)', fontSize: 13, outline: 'none' }}
                    placeholder={ph} value={editForm[key]}
                    onChange={e => { setEditForm(f => ({ ...f, [key]: e.target.value })); setEditErr('') }} />
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--text-400)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  <i className="bi bi-geo-alt" style={{ color: 'var(--cyan-light)', fontSize: 11 }}></i>Address
                </label>
                <textarea rows={2}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-200)', fontSize: 13, resize: 'vertical', minHeight: 64, outline: 'none' }}
                  placeholder="Your address"
                  value={editForm.address}
                  onChange={e => { setEditForm(f => ({ ...f, address: e.target.value })); setEditErr('') }} />
              </div>
              <div style={{ gridColumn: '1 / -1', padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 7, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-600)', marginBottom: 2 }}>EMAIL (not editable)</div>
                <div style={{ fontSize: 13, color: 'var(--text-600)' }}>{profile.email}</div>
              </div>
            </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Change Password + Authenticator ─────────────────────────── */}
      {/* Two side-by-side cards: left for password change, right for TOTP management */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Change Password */}
        <div className="table-card">
          <div className="table-toolbar">
            <p className="table-toolbar-title">
              <i className="bi bi-lock-fill" style={{ marginRight: 7, color: 'var(--cyan-light)', fontSize: 13 }}></i>Change Password
            </p>
          </div>
          <div style={{ padding: '18px 24px' }}>
            {cpSuccess && (
              <div style={{ background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.3)', color: '#34d399', borderRadius: 8, padding: '9px 13px', fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
                <i className="bi bi-check-circle-fill"></i>{cpSuccess}
              </div>
            )}
            {!showCp ? (
              <button onClick={() => { setShowCp(true); setCpError(''); setCpSuccess('') }}
                className="btn-secondary-custom"
                style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, padding: '7px 16px', borderRadius: 7, cursor: 'pointer', fontWeight: 500 }}>
                <i className="bi bi-pencil"></i>Change password
              </button>
            ) : (
              <>
                {cpError && (
                  <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', color: '#f87171', borderRadius: 8, padding: '9px 13px', fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <i className="bi bi-exclamation-circle-fill"></i>{cpError}
                  </div>
                )}
                {[
                  { key: 'currentPassword', label: 'Current password' },
                  { key: 'newPassword',     label: 'New password' },
                  { key: 'confirm',         label: 'Confirm new password' },
                ].map(({ key, label }) => (
                  <div key={key} style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-600)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showPwd ? 'text' : 'password'}
                        style={{ width: '100%', padding: '7px 36px 7px 11px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-200)', fontSize: 13, outline: 'none' }}
                        placeholder="••••••••"
                        value={cpForm[key]}
                        onChange={e => { setCpForm(f => ({ ...f, [key]: e.target.value })); setCpError('') }} />
                      {key === 'newPassword' && (
                        <button type="button" onClick={() => setShowPwd(p => !p)}
                          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-600)', fontSize: 13 }}>
                          <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button onClick={() => setShowCp(false)}
                    className="btn-secondary-custom"
                    style={{ flex: 1, padding: '7px', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={handleChangePassword} disabled={cpLoading}
                    style={{ flex: 2, padding: '7px', background: '#0891b2', border: 'none', borderRadius: 7, fontSize: 13, color: '#fff', cursor: cpLoading ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: cpLoading ? .7 : 1 }}>
                    {cpLoading ? 'Saving...' : 'Update password'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Authenticator App */}
        <div className="table-card">
          <div className="table-toolbar">
            <p className="table-toolbar-title">
              <i className="bi bi-shield-lock-fill" style={{ marginRight: 7, color: 'var(--cyan-light)', fontSize: 13 }}></i>Authenticator App
            </p>
            <span style={{ fontSize: 11, fontWeight: 700, background: profile.totpEnabled ? 'rgba(16,185,129,.15)' : 'rgba(255,255,255,.06)', color: profile.totpEnabled ? '#34d399' : 'var(--text-600)', padding: '3px 11px', borderRadius: 20, border: `1px solid ${profile.totpEnabled ? 'rgba(16,185,129,.3)' : 'var(--border)'}` }}>
              {profile.totpEnabled ? '● Enabled' : '○ Disabled'}
            </span>
          </div>
          <div style={{ padding: '18px 24px' }}>
            {totpError && (
              <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', color: '#f87171', borderRadius: 8, padding: '9px 13px', fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
                <i className="bi bi-exclamation-circle-fill"></i>{totpError}
              </div>
            )}
            {totpSuccess && (
              <div style={{ background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.3)', color: '#34d399', borderRadius: 8, padding: '9px 13px', fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
                <i className="bi bi-check-circle-fill"></i>{totpSuccess}
              </div>
            )}

            {!profile.totpEnabled ? (
              !totpSetup ? (
                <>
                  <p style={{ fontSize: 13, color: 'var(--text-600)', marginBottom: 14, lineHeight: 1.7 }}>
                    Use Google Authenticator or Authy instead of email OTP on every login.
                  </p>
                  <button onClick={handleTotpSetup} disabled={totpLoading}
                    style={{ padding: '8px 18px', background: '#0891b2', border: 'none', borderRadius: 7, fontSize: 13, color: '#fff', cursor: totpLoading ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: totpLoading ? .7 : 1, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <i className="bi bi-qr-code"></i>{totpLoading ? 'Generating...' : 'Set up authenticator'}
                  </button>
                </>
              ) : (
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-600)', marginBottom: 12, lineHeight: 1.8 }}>
                    1. Scan with Google Authenticator / Authy<br />
                    2. Enter the 6-digit code below to verify
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <div style={{ background: '#fff', padding: 10, borderRadius: 10, display: 'inline-block', boxShadow: '0 2px 12px rgba(0,0,0,.2)' }}>
                      <QRCodeSVG value={totpSetup.qrCodeUri} size={148} />
                    </div>
                  </div>
                  <div style={{ background: 'var(--surface-2)', borderRadius: 7, padding: '8px 12px', marginBottom: 12, border: '1px solid var(--border)' }}>
                    <p style={{ margin: '0 0 3px', fontSize: 10, color: 'var(--text-600)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Manual entry key</p>
                    <code style={{ fontSize: 11.5, color: 'var(--cyan-light)', wordBreak: 'break-all', letterSpacing: .5 }}>{totpSetup.manualKey}</code>
                  </div>
                  <input
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-200)', fontSize: 24, letterSpacing: 12, textAlign: 'center', fontFamily: 'monospace', marginBottom: 10, outline: 'none' }}
                    type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                    value={totpCode}
                    onChange={e => { setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setTotpError('') }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setTotpSetup(null); setTotpCode(''); setTotpError('') }}
                      className="btn-secondary-custom"
                      style={{ flex: 1, padding: '7px', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>
                      Cancel
                    </button>
                    <button onClick={handleTotpEnable} disabled={totpLoading || totpCode.length < 6}
                      style={{ flex: 2, padding: '7px', background: '#16a34a', border: 'none', borderRadius: 7, fontSize: 13, color: '#fff', cursor: (totpLoading || totpCode.length < 6) ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: (totpLoading || totpCode.length < 6) ? .7 : 1 }}>
                      {totpLoading ? 'Verifying...' : 'Enable authenticator'}
                    </button>
                  </div>
                </div>
              )
            ) : (
              !showDisable ? (
                <>
                  <p style={{ fontSize: 13, color: 'var(--text-600)', marginBottom: 14, lineHeight: 1.7 }}>
                    Your authenticator app is active. Codes are generated by your app every 30 seconds.
                  </p>
                  <button onClick={() => { setShowDisable(true); setTotpError('') }}
                    style={{ padding: '8px 18px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 7, fontSize: 13, color: '#f87171', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <i className="bi bi-shield-x"></i>Disable authenticator
                  </button>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-600)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>Confirm password</label>
                    <input type="password"
                      style={{ width: '100%', padding: '7px 11px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-200)', fontSize: 13, outline: 'none' }}
                      placeholder="Enter password to confirm"
                      value={disablePwd}
                      onChange={e => { setDisablePwd(e.target.value); setTotpError('') }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setShowDisable(false); setDisablePwd(''); setTotpError('') }}
                      className="btn-secondary-custom"
                      style={{ flex: 1, padding: '7px', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>
                      Cancel
                    </button>
                    <button onClick={handleTotpDisable} disabled={totpLoading}
                      style={{ flex: 2, padding: '7px', background: '#dc2626', border: 'none', borderRadius: 7, fontSize: 13, color: '#fff', cursor: totpLoading ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: totpLoading ? .7 : 1 }}>
                      {totpLoading ? 'Disabling...' : 'Confirm disable'}
                    </button>
                  </div>
                </>
              )
            )}
          </div>
        </div>
      </div>

      {/* ── Help & Support ───────────────────────────────────────────────────── */}
      <div className="table-card">
        <div className="table-toolbar">
          <p className="table-toolbar-title">
            <i className="bi bi-headset" style={{ marginRight: 7, color: 'var(--cyan-light)', fontSize: 13 }}></i>Help &amp; Support
          </p>
        </div>
        <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-200)', marginBottom: 3 }}>Have a question or issue?</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-600)' }}>Send us a message — we'll reply to your registered email.</div>
          </div>
          <button onClick={() => setSupportOpen(true)}
            style={{ padding: '9px 22px', background: '#0891b2', border: 'none', borderRadius: 8, fontSize: 13, color: '#fff', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <i className="bi bi-chat-dots-fill"></i>Contact Support
          </button>
        </div>
      </div>

      {/* Contact Support modal — pre-fills name and email from the auth context */}
      <ContactSupportModal
        show={supportOpen}
        onHide={() => setSupportOpen(false)}
        prefillName={user?.name || ''}
        prefillEmail={user?.email || ''}
      />
      </div>
    </div>
  )
}
