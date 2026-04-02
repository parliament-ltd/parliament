import { Component } from 'react'
import { AlertTriangle, RefreshCw, Download } from 'lucide-react'

/**
 * ErrorBoundary — catches any render-time JS error in the subtree and
 * shows a recovery screen instead of a blank white page.
 *
 * Two variants:
 *  - <ErrorBoundary>          top-level, full-page recovery UI
 *  - <ErrorBoundary inline>   route-level, smaller inline card
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    // Surface in console so developers can diagnose
    console.error('[Apollo ErrorBoundary]', error, errorInfo?.componentStack)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    // Clear error state and navigate home without a full reload
    this.setState({ error: null, errorInfo: null })
    window.location.href = '/'
  }

  render() {
    const { error, errorInfo } = this.state
    const { children, inline } = this.props

    if (!error) return children

    if (inline) {
      return (
        <div
          className="flex flex-col items-center justify-center gap-3 p-8 text-center"
          style={{ color: '#787774' }}
        >
          <AlertTriangle className="w-6 h-6" style={{ color: '#D9730D' }} />
          <p className="text-sm font-medium" style={{ color: '#191919' }}>
            Something went wrong loading this page.
          </p>
          <button
            onClick={this.handleGoHome}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-[#E9E9E7] bg-white hover:border-[#B8A070] transition-colors"
            style={{ color: '#191919' }}
          >
            Go back home
          </button>
        </div>
      )
    }

    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: '#FAFAF9' }}
      >
        <div
          className="w-full max-w-md px-8 py-8 rounded-2xl border bg-white text-center"
          style={{ borderColor: '#E9E9E7', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
        >
          {/* Icon */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: 'rgba(217,115,13,0.08)', border: '1px solid rgba(217,115,13,0.15)' }}
          >
            <AlertTriangle className="w-5 h-5" style={{ color: '#D9730D' }} />
          </div>

          {/* Heading */}
          <h2 className="text-base font-semibold mb-2" style={{ color: '#191919' }}>
            Something went wrong
          </h2>

          {/* Reassurance */}
          <p className="text-sm leading-relaxed mb-1" style={{ color: '#787774' }}>
            Your conversations are safe — this is a display error, not a data loss.
          </p>
          <p className="text-sm leading-relaxed mb-6" style={{ color: '#787774' }}>
            Reloading the page usually fixes it.
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={this.handleReload}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#B8A070' }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload page
            </button>
            <button
              onClick={this.handleGoHome}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium border border-[#E9E9E7] bg-white transition-colors hover:border-[#B8A070]"
              style={{ color: '#191919' }}
            >
              Go back home
            </button>
          </div>

          {/* Collapsed error detail for debugging */}
          {error && (
            <details className="mt-6 text-left">
              <summary
                className="text-xs cursor-pointer select-none"
                style={{ color: '#9B9A97' }}
              >
                Technical details
              </summary>
              <pre
                className="mt-2 p-3 rounded-lg text-[10px] leading-relaxed overflow-auto max-h-40"
                style={{ backgroundColor: '#F7F6F3', color: '#787774', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
              >
                {error.toString()}
                {errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      </div>
    )
  }
}
