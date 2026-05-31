import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import axiosClient from '../api/axiosClient'

const AlertBadgesContext = createContext({})
const GLOW_AFTER_MS  = 3 * 60 * 1000 // glow starts after 3 min
const SOUND_INTERVAL = 8 * 1000       // chime repeats every 8 s

export function useAlertBadges() {
  return useContext(AlertBadgesContext)
}

// ── Web Audio chime (no audio file needed) ──────────────────
function playChime(audioCtx) {
  if (!audioCtx) return
  const notes = [880, 660]        // A5 → E5 gentle two-tone ding
  notes.forEach((freq, i) => {
    const osc  = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.type = 'sine'
    const t = audioCtx.currentTime + i * 0.18
    osc.frequency.setValueAtTime(freq, t)
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.25, t + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
    osc.start(t)
    osc.stop(t + 0.42)
  })
}

export function AlertBadgesProvider({ children }) {
  const { user } = useAuth()
  const [badges, setBadges] = useState({
    lowStock: 0, pendingReplenishment: 0,
    pendingPurchaseOrders: 0, pendingOrders: 0, pendingPayments: 0,
    issuedInvoices: 0,
  })
  const [glowing, setGlowing] = useState({ inventory: false, procurement: false, finance: false })
  const [sounding, setSounding] = useState({ inventory: false, procurement: false, finance: false })

  const nonZeroSince = useRef({ inventory: null, procurement: null, finance: null })
  const glowTimers   = useRef({ inventory: null, procurement: null, finance: null })
  const soundTimers  = useRef({ inventory: null, procurement: null, finance: null })
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

  const startSound = useCallback((key) => {
    if (soundTimers.current[key]) return               // already running
    const ctx = audioCtxRef.current
    playChime(ctx)                                     // play immediately
    soundTimers.current[key] = setInterval(() => playChime(audioCtxRef.current), SOUND_INTERVAL)
    setSounding(s => ({ ...s, [key]: true }))
  }, [])

  const stopSound = useCallback((key) => {
    clearInterval(soundTimers.current[key])
    soundTimers.current[key] = null
    setSounding(s => ({ ...s, [key]: false }))
  }, [])

  // Called when user clicks the glowing navbar pill — silences that section
  const muteSection = useCallback((key) => {
    stopSound(key)
  }, [stopSound])

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

  useEffect(() => {
    if (!user) {
      setBadges({ lowStock:0, pendingReplenishment:0, pendingPurchaseOrders:0, pendingOrders:0, pendingPayments:0, issuedInvoices:0 })
      return
    }
    fetchBadges()
    const id = setInterval(fetchBadges, 60000)
    return () => clearInterval(id)
  }, [user, fetchBadges])

  const inventory   = badges.lowStock
  const procurement = badges.pendingReplenishment + badges.pendingPurchaseOrders
  const finance     = badges.pendingOrders + badges.pendingPayments + badges.issuedInvoices

  useEffect(() => {
    const sections = { inventory, procurement, finance }
    Object.entries(sections).forEach(([key, count]) => {
      if (count > 0) {
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
    <AlertBadgesContext.Provider value={{
      badges, inventory, procurement, finance,
      glowing, sounding, muteSection, fetchBadges
    }}>
      {children}
    </AlertBadgesContext.Provider>
  )
}
