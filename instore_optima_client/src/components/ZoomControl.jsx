// ZoomControl.jsx
// A standalone zoom-control widget that shows a magnifier icon button.
// Clicking it toggles a small dropdown with:
//   • Minus / current-percent / Plus buttons (steps of 10%).
//   • A row of preset percentage buttons (70 % – 150 %).
// The zoom value is clamped between 70 and 150 so the app never becomes
// unusably small or comically large.
// This component is currently embedded inside the TopNavbar profile dropdown
// rather than rendered separately, but the standalone version remains available.

import { useState } from 'react'

// Props:
//   zoom    – current zoom percentage received from the parent.
//   setZoom – callback to persist the new zoom value in the parent's state.
export default function ZoomControl({ zoom, setZoom }) {
  // Controls whether the zoom dropdown panel is visible.
  const [showDropdown, setShowDropdown] = useState(false)

  // Adjusts the zoom by a relative delta (e.g. +10 zooms in, -10 zooms out).
  const changeZoom = (delta) => {
    setZoom(prev => Math.max(70, Math.min(150, prev + delta)))
  }

  // Snaps the zoom back to the default 100 %.
  const resetZoom = () => {
    setZoom(100)
  }

  // Sets the zoom to an absolute value while enforcing the 70–150 clamp.
  const applyZoom = (z) => {
    setZoom(Math.max(70, Math.min(150, z)))
  }

  return (
    <div className="zoom-control-standalone" title="Adjust zoom level">
      {/* Magnifier icon that opens/closes the zoom panel */}
      <button
        className="zoom-control-btn"
        onClick={() => setShowDropdown(!showDropdown)}
        title="Zoom controls"
      >
        {/* Custom SVG magnifier with a "+" cross — indicates zoom-in affordance */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="10" cy="10" r="7"></circle>
          <line x1="10" y1="7" x2="10" y2="13"></line>
          <line x1="7" y1="10" x2="13" y2="10"></line>
          <path d="m17 17 5 5"></path>
        </svg>
      </button>

      {/* Dropdown panel — only rendered when showDropdown is true */}
      {showDropdown && (
        <div className="zoom-control-dropdown">
          {/* Minus / percentage display / Plus row */}
          <div className="zoom-control-group">
            <button
              className="zoom-control-minus"
              onClick={() => changeZoom(-10)}
              title="Zoom out"
            >
              −
            </button>
            {/* Clicking the percentage resets to 100 % */}
            <button
              className="zoom-control-display"
              onClick={resetZoom}
              title="Reset zoom to 100%"
            >
              {zoom}%
            </button>
            <button
              className="zoom-control-plus"
              onClick={() => changeZoom(10)}
              title="Zoom in"
            >
              +
            </button>
          </div>
          {/* Preset buttons — the active one gets a highlighted style */}
          <div className="zoom-control-presets">
            {[70, 85, 100, 115, 130, 150].map(z => (
              <button
                key={z}
                className={`zoom-control-preset ${zoom === z ? 'zoom-control-preset-active' : ''}`}
                onClick={() => {
                  applyZoom(z)
                  setShowDropdown(false) // close the panel after selecting a preset
                }}
                title={`Set zoom to ${z}%`}
              >
                {z}%
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
