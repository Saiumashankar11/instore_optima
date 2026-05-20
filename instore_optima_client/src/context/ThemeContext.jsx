import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : true
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.removeAttribute('data-theme')
    } else {
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
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}