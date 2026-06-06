// useUndoDelete.jsx
// Custom hook that wraps every destructive delete action with a 6-second grace period.
// During that window the user sees a bottom-center toast with "Undo" and "Delete Now" buttons.
// If the user does nothing, the real API delete fires automatically after DELAY ms.

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
  // pending — when non-null, the undo toast is visible; contains label + live countdown
  const [pending, setPending] = useState(null)   // { label, countdown }
  // timerRef — the setTimeout that fires the real delete after DELAY
  const timerRef    = useRef(null)
  // countRef — the setInterval that ticks the countdown display every 250 ms
  const countRef    = useRef(null)
  // callbackRef — stores the delete callback object so it can be called from any closure
  const callbackRef = useRef(null)

  // clear — cancel both the countdown interval and the fire timer
  const clear = useCallback(() => {
    clearTimeout(timerRef.current)
    clearInterval(countRef.current)
    timerRef.current  = null
    countRef.current  = null
  }, [])

  // fireNow — immediately execute the real delete API call (used by "Delete Now" button and auto-fire)
  const fireNow = useCallback(async () => {
    clear()
    const cb = callbackRef.current
    callbackRef.current = null
    if (cb) {
      try {
        await cb.deleteFn()
        cb.onDeleted?.()
      } catch (e) {
        // If the API call fails, treat it like an undo so the item reappears
        cb.onError?.(e)
        cb.onUndo?.()
      }
    }
    setPending(null)
  }, [clear])

  // scheduleDelete — begin the grace period for a delete action
  const scheduleDelete = useCallback(({ id, label, deleteFn, onDeleted, onUndo, onError }) => {
    // Cancel any existing pending delete first (fire it immediately)
    if (callbackRef.current) {
      clear()
      callbackRef.current.deleteFn()
      callbackRef.current.onDeleted?.()
    }

    callbackRef.current = { id, deleteFn, onDeleted, onUndo, onError }

    const start = Date.now()
    // Show the toast immediately with the full countdown
    setPending({ label, countdown: DELAY / 1000 })

    // Tick the countdown number in the toast every 250 ms
    countRef.current = setInterval(() => {
      const remaining = Math.ceil((DELAY - (Date.now() - start)) / 1000)
      if (remaining <= 0) { clearInterval(countRef.current); return }
      setPending(p => p ? { ...p, countdown: remaining } : null)
    }, 250)

    // Fire the real delete after the grace period
    timerRef.current = setTimeout(fireNow, DELAY)
  }, [clear])

  // undoDelete — cancel the scheduled delete and call the onUndo callback
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

  // UndoToast — a portal-rendered JSX element (not a component) rendered at the bottom-center.
  // Using useMemo + a JSX element (rather than a component) means React updates it in-place
  // on countdown ticks without unmounting and remounting the DOM node.
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
        {/* Live countdown text — updates every 250 ms via the setInterval above */}
        <span style={{ flex: 1, fontSize: 13, color: '#e2e8f0' }}>
          <strong style={{ color: '#f87171' }}>{pending.label}</strong> will be deleted in {pending.countdown}s
        </span>
        {/* Undo button — cancels the scheduled delete and restores the item */}
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
        {/* Delete Now button — skips the remaining grace period and fires immediately */}
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

  // Expose everything the calling component needs
  return { pendingDelete: pending, scheduleDelete, undoDelete, fireNow, UndoToast }
}
