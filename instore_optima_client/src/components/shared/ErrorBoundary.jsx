import { Component } from 'react'

/**
 * Global React Error Boundary — catches runtime JS errors in any child component
 * and shows a friendly fallback UI instead of a blank page.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Log to console (Serilog will pick up from backend if you send it)
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', background: 'var(--bg-950, #0a0a0f)', padding: 24
        }}>
          <div style={{
            maxWidth: 460, width: '100%', background: 'var(--bg-900, #12121a)',
            border: '1px solid var(--border, #1e293b)', borderRadius: 12, padding: '40px 32px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ color: 'var(--text-200, #f1f5f9)', fontSize: 20, marginBottom: 8, fontWeight: 600 }}>
              Something went wrong
            </h2>
            <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
              An unexpected error occurred. This has been logged for review.
              Please try again or contact support if the issue persists.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  background: 'var(--cyan, #06b6d4)', color: '#fff', border: 'none',
                  padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => { window.location.href = '/' }}
                style={{
                  background: 'transparent', color: 'var(--text-muted, #94a3b8)',
                  border: '1px solid var(--border, #1e293b)',
                  padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: 13
                }}
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
