// ThemeContext.jsx
// Manages the app's dark / light mode preference.
// The chosen theme is stored in localStorage so it persists across page reloads.
// Dark mode is the default when no preference has been saved yet.

import { createContext, useContext, useState, useEffect } from 'react'

// The React context object — consumed via useTheme()
const ThemeContext = createContext(null)

// ── Provider ──────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }) {
  // Initialise from localStorage; fall back to dark mode if nothing is saved
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : true
  })

  // Whenever dark changes: update the data-theme attribute on <html> and save the preference
  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      // Dark mode is the CSS default — no data-theme attribute needed
      root.removeAttribute('data-theme')
    } else {
      // Light mode is activated via data-theme="light" on the root element
      root.setAttribute('data-theme', 'light')
    }
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    // Remove transition class after animation completes
    const t = setTimeout(() => root.classList.remove('theme-transitioning'), 300)
    return () => clearTimeout(t)
  }, [dark])

  const toggle = () => {
    // Add transition class BEFORE setDark so it's present when data-theme changes
    document.documentElement.classList.add('theme-transitioning')
    setDark(d => !d)
  }

  return (
    // Provide the current theme flag and the toggle function to all children
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Custom hook — call useTheme() to read `dark` or call `toggle()`
export function useTheme() {
  return useContext(ThemeContext)
}