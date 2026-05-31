import { useState } from 'react'
import { createPortal } from 'react-dom'
import { contactSupportApi } from '../services/supportService'
import { parseApiError } from '../utils/validators'

export default function ContactSupportModal({ show, onHide, prefillName = '', prefillEmail = '' }) {
  const [form, setForm]     = useState({ name: prefillName, email: prefillEmail, message: '' })
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  if (!show) return null

  const handleChange = field => e => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    if (error) setError('')
  }

  const handleSubmit = async () => {
    if (!form.name.trim())    return setError('Please enter your name.')
    if (!form.email.trim())   return setError('Please enter your email.')
    if (!form.message.trim()) return setError('Please enter a message.')
    if (form.message.length < 10) return setError('Message must be at least 10 characters.')

    setLoading(true)
    setError('')
    try {
      await contactSupportApi(form)
      setSuccess('Message sent! We\'ll get back to you soon.')
      setForm(f => ({ ...f, message: '' }))
      setTimeout(() => { setSuccess(''); onHide() }, 2000)
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleBackdrop = e => { if (e.target === e.currentTarget) onHide() }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={handleBackdrop}>
      <div style={{ width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ background: '#fff', borderRadius: 12, border: 'none', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>

          {/* Header */}
          <div style={{ padding: '22px 28px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(8,145,178,.1)', border: '1px solid rgba(8,145,178,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="bi bi-headset" style={{ color: '#0891b2', fontSize: 16 }}></i>
                </div>
                <h5 style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: 16 }}>Contact Support</h5>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>We'll reply to your email address.</p>
            </div>
            <button onClick={onHide} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 20, lineHeight: 1, padding: 2 }}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          <div style={{ padding: '20px 28px 24px' }}>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                <i className="bi bi-exclamation-circle"></i>{error}
              </div>
            )}
            {success && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                <i className="bi bi-check-circle"></i>{success}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Your name</label>
                <input
                  className="form-control"
                  style={{ fontSize: 13 }}
                  placeholder="Full name"
                  value={form.name}
                  onChange={handleChange('name')}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Email address</label>
                <input
                  className="form-control"
                  style={{ fontSize: 13 }}
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange('email')}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Message</label>
              <textarea
                className="form-control"
                style={{ fontSize: 13, resize: 'vertical', minHeight: 100 }}
                placeholder="Describe your issue or question..."
                value={form.message}
                onChange={handleChange('message')}
                rows={4}
              />
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, textAlign: 'right' }}>
                {form.message.length}/2000
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onHide}
                style={{ padding: '8px 18px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, color: '#374151', cursor: 'pointer', fontWeight: 500 }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                style={{ padding: '8px 22px', background: '#0891b2', border: 'none', borderRadius: 7, fontSize: 13, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 7 }}>
                {loading
                  ? <><i className="bi bi-hourglass-split"></i> Sending...</>
                  : <><i className="bi bi-send"></i> Send message</>}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  )
}
