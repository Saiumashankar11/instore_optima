import { useRef, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'

const DELAY = 6000 // ms before real delete fires

/**
 * useUndoDelete — gives every page a safe "delete with undo" flow.
 *
 * Usage:
 *   const { pendingDelete, scheduleDelete, undoDelete, UndoToast } = useUndoDelete()
 *
 *   // When user confirms delete:
 *   scheduleDelete({
 *     id: row.id,
 *     label: 'Order #5',          // shown in the toast
 *     deleteFn: () => deleteApi(row.id),
 *     onDeleted: () => load(),    // called AFTER real delete fires (or immediately optimistic)
 *     onUndo: () => load(),       // called if user clicks Undo
 *   })
 *
 *   // Render the toast somewhere in your JSX:
 *   <UndoToast />
 */
export function useUndoDelete() {
  const [pending, setPending] = useState(null)   // { label, countdown }
  const timerRef    = useRef(null)
  const countRef    = useRef(null)
  const callbackRef = useRef(null)

  const clear = useCallback(() => {
    clearTimeout(timerRef.current)
    clearInterval(countRef.current)
    timerRef.current  = null
    countRef.current  = null
  }, [])

  const fireNow = useCallback(async () => {
    clear()
    const cb = callbackRef.current
    callbackRef.current = null
    if (cb) {
      try {
        await cb.deleteFn()
        cb.onDeleted?.()
      } catch (e) {
        cb.onError?.(e)
        cb.onUndo?.()
      }
    }
    setPending(null)
  }, [clear])

  const scheduleDelete = useCallback(({ id, label, deleteFn, onDeleted, onUndo, onError }) => {
    // Cancel any existing pending delete first (fire it immediately)
    if (callbackRef.current) {
      clear()
      callbackRef.current.deleteFn()
      callbackRef.current.onDeleted?.()
    }

    callbackRef.current = { id, deleteFn, onDeleted, onUndo, onError }

    const start = Date.now()
    setPending({ label, countdown: DELAY / 1000 })

    countRef.current = setInterval(() => {
      const remaining = Math.ceil((DELAY - (Date.now() - start)) / 1000)
      if (remaining <= 0) { clearInterval(countRef.current); return }
      setPending(p => p ? { ...p, countdown: remaining } : null)
    }, 250)

    timerRef.current = setTimeout(fireNow, DELAY)
  }, [clear])

  const undoDelete = useCallback(() => {
    clear()
    const cb = callbackRef.current
    callbackRef.current = null
    if (cb?.onUndo) cb.onUndo()
    setPending(null)
  }, [clear])

  // Stable ref so UndoToast component never remounts on countdown ticks
  const pendingRef = useRef(pending)
  pendingRef.current = pending

  const undoDeleteRef = useRef(undoDelete)
  undoDeleteRef.current = undoDelete

  // Return a JSX element (not a component) — so React updates in-place, no remount
  const UndoToast = useMemo(() => {
    if (!pending) return null
    return createPortal(
      <div style={{
        position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, display: 'flex', alignItems: 'center', gap: 14,
        background: '#1e293b', border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 10, padding: '12px 18px',
        boxShadow: '0 8px 32px rgba(0,0,0,.5)',
        animation: 'slideUpIn .25s ease',
        minWidth: 320, maxWidth: '90vw',
      }}>
        <i className="bi bi-trash" style={{ color: '#f87171', fontSize: 16 }}></i>
        <span style={{ flex: 1, fontSize: 13, color: '#e2e8f0' }}>
          <strong style={{ color: '#f87171' }}>{pending.label}</strong> will be deleted in {pending.countdown}s
        </span>
        <button
          onClick={undoDelete}
          style={{
            background: 'rgba(8,145,178,.2)', border: '1px solid rgba(8,145,178,.4)',
            color: '#22d3ee', borderRadius: 6, padding: '5px 14px',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          <i className="bi bi-arrow-counterclockwise" style={{ marginRight: 5 }}></i>Undo
        </button>
        <button
          onClick={fireNow}
          style={{
            background: 'rgba(239,68,68,.2)', border: '1px solid rgba(239,68,68,.4)',
            color: '#f87171', borderRadius: 6, padding: '5px 14px',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          <i className="bi bi-trash" style={{ marginRight: 5 }}></i>Delete Now
        </button>
      </div>,
      document.body
    )
  }, [pending, undoDelete, fireNow])

  return { pendingDelete: pending, scheduleDelete, undoDelete, fireNow, UndoToast }
}
