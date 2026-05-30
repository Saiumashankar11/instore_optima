import { useState } from 'react'

export default function ZoomControl({ zoom, setZoom }) {
  const [showDropdown, setShowDropdown] = useState(false)

  const changeZoom = (delta) => {
    setZoom(prev => Math.max(70, Math.min(150, prev + delta)))
  }

  const resetZoom = () => {
    setZoom(100)
  }

  const applyZoom = (z) => {
    setZoom(Math.max(70, Math.min(150, z)))
  }

  return (
    <div className="zoom-control-standalone" title="Adjust zoom level">
      <button
        className="zoom-control-btn"
        onClick={() => setShowDropdown(!showDropdown)}
        title="Zoom controls"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="10" cy="10" r="7"></circle>
          <line x1="10" y1="7" x2="10" y2="13"></line>
          <line x1="7" y1="10" x2="13" y2="10"></line>
          <path d="m17 17 5 5"></path>
        </svg>
      </button>

      {showDropdown && (
        <div className="zoom-control-dropdown">
          <div className="zoom-control-group">
            <button
              className="zoom-control-minus"
              onClick={() => changeZoom(-10)}
              title="Zoom out"
            >
              −
            </button>
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
          <div className="zoom-control-presets">
            {[70, 85, 100, 115, 130, 150].map(z => (
              <button
                key={z}
                className={`zoom-control-preset ${zoom === z ? 'zoom-control-preset-active' : ''}`}
                onClick={() => {
                  applyZoom(z)
                  setShowDropdown(false)
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
