// main.jsx
// Entry point for the React application.
// This is the very first file that runs in the browser. It mounts the React component tree
// into the <div id="root"> element defined in index.html.

import React from 'react'
import ReactDOM from 'react-dom/client'
// Root application component — contains all routing, providers, and page components
import App from './App.jsx'
// ThemeProvider reads/writes the user's light/dark theme preference
import { ThemeProvider } from './context/ThemeContext.jsx'
// Global CSS styles applied to every page
import './index.css'

// ReactDOM.createRoot is the modern React 18 API for rendering.
// getElementById('root') targets the mounting point in index.html.
ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode renders components twice in development to surface side-effects and deprecated APIs.
  // It has no effect in the production build.
  <React.StrictMode>
    {/* ThemeProvider must wrap App so every component can read the current theme */}
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
)