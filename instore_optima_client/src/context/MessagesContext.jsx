// MessagesContext.jsx
// Tracks the count of unread internal messages for the logged-in user and exposes
// it app-wide so the inbox badge in the navbar always stays up to date.
// On login it also shows a temporary popup toast if the user has unread messages.

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getUnreadCount } from '../services/internalMessageService'
import { useAuth } from './AuthContext'
import { createPortal } from 'react-dom'

// The React context object — consumed via useMessages()
const MessagesContext = createContext(null)

// ── Provider ──────────────────────────────────────────────────────────────────
export function MessagesProvider({ children }) {
  // Get the current user and their role so we can build the messages URL
  const { user, role } = useAuth()
  // Total number of messages the user hasn't opened yet
  const [unreadCount, setUnreadCount] = useState(0)
  // When non-null, shows the login popup toast with the unread count
  const [loginPopup, setLoginPopup]   = useState(null)
  // Ensures the login popup only appears once per session, not on every re-render
  const didShowLoginPopup             = useRef(false)

  // fetchUnread — GET /api/messages/unread-count and update the badge counter
  const fetchUnread = useCallback(async () => {
    if (!user) return
    try {
      const res = await getUnreadCount()
      const count = res.data?.unreadCount ?? 0
      setUnreadCount(count)
      return count
    } catch { return 0 }
  }, [user])

  // On login: show the login popup once if there are unread messages.
  // On logout: reset all state so a fresh login starts clean.
  useEffect(() => {
    if (!user) {
      didShowLoginPopup.current = false
      setLoginPopup(null)
      setUnreadCount(0)
      return
    }
    if (!didShowLoginPopup.current) {
      didShowLoginPopup.current = true
      getUnreadCount()
        .then(res => {
          const count = res.data?.unreadCount ?? 0
          setUnreadCount(count)
          if (count > 0) {
            setLoginPopup({ count })
            setTimeout(() => setLoginPopup(null), 6000)  // auto-dismiss after 6 s
          }
        })
        .catch(() => {})
    }
  }, [user])

  // Poll the unread count every 30 seconds to keep the badge fresh
  useEffect(() => {
    if (!user) return
    const id = setInterval(fetchUnread, 30000)
    return () => clearInterval(id)
  }, [user, fetchUnread])

  // dismissLoginPopup — close the login toast manually
  const dismissLoginPopup = () => setLoginPopup(null)

  // goToMessages — close the popup and navigate to the role-specific inbox page
  const goToMessages = () => {
    dismissLoginPopup()
    window.location.href = `/${role?.toLowerCase()}/messages`
  }

  return (
    <MessagesContext.Provider value={{ unreadCount, setUnreadCount, fetchUnread }}>
      {children}

      {/* Render the login popup in a portal so it floats above all other content */}
      {loginPopup && createPortal(
        <div className="msg-login-popup" onClick={goToMessages}>
          <div className="msg-login-popup-inner">
            <div className="msg-login-popup-icon">
              {/* Envelope icon with unread count badge */}
              <i className="bi bi-envelope-fill"></i>
              <span className="msg-login-popup-badge">{loginPopup.count}</span>
            </div>
            <div className="msg-login-popup-text">
              <div className="msg-login-popup-title">
                You have {loginPopup.count} unread message{loginPopup.count > 1 ? 's' : ''}
              </div>
              <div className="msg-login-popup-sub">
                Click to go to inbox · or dismiss
              </div>
            </div>
            {/* X button stops click from bubbling up to the goToMessages handler */}
            <button
              className="msg-login-popup-close"
              onClick={e => { e.stopPropagation(); dismissLoginPopup() }}
            >
              <i className="bi bi-x"></i>
            </button>
          </div>
        </div>,
        document.body
      )}
    </MessagesContext.Provider>
  )
}

// Custom hook — call useMessages() to read unreadCount or trigger fetchUnread
export function useMessages() {
  return useContext(MessagesContext)
}

