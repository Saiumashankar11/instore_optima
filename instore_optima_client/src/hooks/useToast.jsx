import { useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * useToast hook — provides show() function and <ToastContainer /> component.
 * Replaces all alert() calls with styled in-app notifications.
 */
export function useToast() {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const show = useCallback((message, type = 'error', duration = 4000) => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const ToastContainer = createPortal(
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 999999,
      display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380, pointerEvents: 'none'
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === 'success' ? 'rgba(16,185,129,.15)' : t.type === 'warning' ? 'rgba(245,158,11,.15)' : 'rgba(239,68,68,.15)',
          border: `1px solid ${t.type === 'success' ? 'rgba(16,185,129,.3)' : t.type === 'warning' ? 'rgba(245,158,11,.3)' : 'rgba(239,68,68,.3)'}`,
          color: t.type === 'success' ? '#34d399' : t.type === 'warning' ? '#fbbf24' : '#f87171',
          padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'slideInRight .25s ease-out',
          boxShadow: '0 4px 24px rgba(0,0,0,.3)', backdropFilter: 'blur(8px)',
          pointerEvents: 'all',
        }}>
          <i className={`bi ${t.type === 'success' ? 'bi-check-circle-fill' : t.type === 'warning' ? 'bi-exclamation-triangle-fill' : 'bi-x-circle-fill'}`}></i>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
          >×</button>
        </div>
      ))}
    </div>,
    document.body
  )

  return { show, ToastContainer }
}
