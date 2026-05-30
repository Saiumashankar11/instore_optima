import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getUnreadCount } from '../services/internalMessageService'
import { useAuth } from './AuthContext'
import { createPortal } from 'react-dom'

const MessagesContext = createContext(null)

export function MessagesProvider({ children }) {
  const { user, role } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [loginPopup, setLoginPopup]   = useState(null)
  const didShowLoginPopup             = useRef(false)

  const fetchUnread = useCallback(async () => {
    if (!user) return
    try {
      const res = await getUnreadCount()
      const count = res.data?.unreadCount ?? 0
      setUnreadCount(count)
      return count
    } catch { return 0 }
  }, [user])

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
            setTimeout(() => setLoginPopup(null), 6000)
          }
        })
        .catch(() => {})
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    const id = setInterval(fetchUnread, 30000)
    return () => clearInterval(id)
  }, [user, fetchUnread])

  const dismissLoginPopup = () => setLoginPopup(null)

  const goToMessages = () => {
    dismissLoginPopup()
    window.location.href = `/${role?.toLowerCase()}/messages`
  }

  return (
    <MessagesContext.Provider value={{ unreadCount, setUnreadCount, fetchUnread }}>
      {children}

      {loginPopup && createPortal(
        <div className="msg-login-popup" onClick={goToMessages}>
          <div className="msg-login-popup-inner">
            <div className="msg-login-popup-icon">
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

export function useMessages() {
  return useContext(MessagesContext)
}

