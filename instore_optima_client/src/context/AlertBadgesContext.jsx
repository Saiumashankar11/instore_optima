// AlertBadgesContext.jsx
// Provides real-time alert badge counts (low stock, pending orders, etc.) to the whole app.
// After badges have been non-zero for 3 minutes, the corresponding navbar section starts
// glowing and plays a repeating audio chime to catch the user's attention.

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import axiosClient from '../api/axiosClient'

// The React context object — components consume this via useAlertBadges()
const AlertBadgesContext = createContext({})
const GLOW_AFTER_MS  = 3 * 60 * 1000 // glow starts after 3 min
const SOUND_INTERVAL = 8 * 1000       // chime repeats every 8 s

// Custom hook — shorthand for useContext(AlertBadgesContext)
export function useAlertBadges() {
  return useContext(AlertBadgesContext)
}

// ── Web Audio chime (no audio file needed) ──────────────────
// Generates a soft two-tone ding using the browser's Web Audio API.
// Each note is shaped with a quick fade-in and slow fade-out for a pleasant bell effect.
function playChime(audioCtx) {
  if (!audioCtx) return
  const notes = [880, 660]        // A5 → E5 gentle two-tone ding
  notes.forEach((freq, i) => {
    const osc  = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.type = 'sine'
    const t = audioCtx.currentTime + i * 0.18  // stagger notes slightly in time
    osc.frequency.setValueAtTime(freq, t)
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.25, t + 0.04)  // quick attack
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)  // slow decay
    osc.start(t)
    osc.stop(t + 0.42)
  })
}

// ── Provider component — wrap your app with this to make badge data available everywhere ──
export function AlertBadgesProvider({ children }) {
  // Pull the logged-in user from AuthContext so we can skip fetching when logged out
  const { user } = useAuth()

  // Raw badge counts returned by the /api/badges endpoint
  const [badges, setBadges] = useState({
    lowStock: 0, pendingReplenishment: 0,
    pendingPurchaseOrders: 0, pendingOrders: 0, pendingPayments: 0,
    issuedInvoices: 0,
  })

  // Tracks whether each navbar section (inventory, procurement, finance) is currently glowing
  const [glowing, setGlowing] = useState({ inventory: false, procurement: false, finance: false })
  // Tracks whether the repeating chime is currently playing for each section
  const [sounding, setSounding] = useState({ inventory: false, procurement: false, finance: false })

  // Timestamp (ms) when each section first went non-zero — used to trigger the 3-min glow delay
  const nonZeroSince = useRef({ inventory: null, procurement: null, finance: null })
  // setTimeout handles that schedule the start of glowing per section
  const glowTimers   = useRef({ inventory: null, procurement: null, finance: null })
  // setInterval handles for the repeating chime per section
  const soundTimers  = useRef({ inventory: null, procurement: null, finance: null })
  // Shared AudioContext — created once and reused for all chimes
  const audioCtxRef  = useRef(null)

  // Create AudioContext on first user interaction so browser allows it
  useEffect(() => {
    const init = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
    }
    window.addEventListener('click', init, { once: true })
    return () => window.removeEventListener('click', init)
  }, [])

  // startSound — begin the repeating chime for a given section key ('inventory', etc.)
  const startSound = useCallback((key) => {
    if (soundTimers.current[key]) return               // already running
    const ctx = audioCtxRef.current
    playChime(ctx)                                     // play immediately
    soundTimers.current[key] = setInterval(() => playChime(audioCtxRef.current), SOUND_INTERVAL)
    setSounding(s => ({ ...s, [key]: true }))
  }, [])

  // stopSound — cancel the repeating chime for a given section
  const stopSound = useCallback((key) => {
    clearInterval(soundTimers.current[key])
    soundTimers.current[key] = null
    setSounding(s => ({ ...s, [key]: false }))
  }, [])

  // Called when user clicks the glowing navbar pill — silences that section
  const muteSection = useCallback((key) => {
    stopSound(key)
  }, [stopSound])

  // fetchBadges — GET /api/badges and update state; errors are silently ignored
  const fetchBadges = useCallback(async () => {
    if (!user) return
    try {
      const res = await axiosClient.get('/api/badges')
      const d = res.data
      setBadges({
        lowStock:              d.lowStock              ?? 0,
        pendingReplenishment:  d.pendingReplenishment  ?? 0,
        pendingPurchaseOrders: d.pendingPurchaseOrders ?? 0,
        pendingOrders:         d.pendingOrders         ?? 0,
        pendingPayments:       d.pendingPayments       ?? 0,
        issuedInvoices:        d.issuedInvoices        ?? 0,
      })
    } catch { /* silent */ }
  }, [user])

  // Poll badges every 60 seconds while logged in; reset to zeros on logout
  useEffect(() => {
    if (!user) {
      setBadges({ lowStock:0, pendingReplenishment:0, pendingPurchaseOrders:0, pendingOrders:0, pendingPayments:0, issuedInvoices:0 })
      return
    }
    fetchBadges()
    const id = setInterval(fetchBadges, 60000)
    return () => clearInterval(id)
  }, [user, fetchBadges])

  // Roll up individual badge counts into three grouped totals for the three navbar sections
  const inventory   = badges.lowStock
  const procurement = badges.pendingReplenishment + badges.pendingPurchaseOrders
  const finance     = badges.pendingOrders + badges.pendingPayments + badges.issuedInvoices

  // When grouped totals change, start or cancel the glow/chime timers per section
  useEffect(() => {
    const sections = { inventory, procurement, finance }
    Object.entries(sections).forEach(([key, count]) => {
      if (count > 0) {
        // Section has alerts — record when it first became non-zero and schedule glow
        if (!nonZeroSince.current[key]) {
          nonZeroSince.current[key] = Date.now()
          glowTimers.current[key] = setTimeout(() => {
            setGlowing(g => ({ ...g, [key]: true }))
            startSound(key)
          }, GLOW_AFTER_MS)
        }
      } else {
        // Resolved — reset everything for this section
        nonZeroSince.current[key] = null
        clearTimeout(glowTimers.current[key])
        glowTimers.current[key] = null
        setGlowing(g => ({ ...g, [key]: false }))
        stopSound(key)
      }
    })
  }, [inventory, procurement, finance, startSound, stopSound])

  return (
    // Expose badge counts, section totals, glow/sound state, and helper functions to all children
    <AlertBadgesContext.Provider value={{
      badges, inventory, procurement, finance,
      glowing, sounding, muteSection, fetchBadges
    }}>
      {children}
    </AlertBadgesContext.Provider>
  )
}
