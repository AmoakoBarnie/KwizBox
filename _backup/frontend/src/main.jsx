import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles.css'

// Kill any stale service worker (from old VitePWA builds) before rendering
if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.unregister())
  }).catch(() => {})
}

// Error boundary to surface React crashes
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }
  componentDidCatch(error, info) {
    this.setState({ error, info })
  }
  render() {
    if (this.state.error) {
      return React.createElement('div', { style: { padding: 20, fontFamily: 'monospace', background: '#fee', color: '#900', position: 'fixed', inset: 0, zIndex: 9999, overflow: 'auto' } },
        React.createElement('h2', null, 'React Error'),
        React.createElement('pre', null, String(this.state.error?.stack || this.state.error)),
        this.state.info && React.createElement('pre', null, this.state.info.componentStack)
      )
    }
    return this.props.children
  }
}

// Respect system reduced-motion preference on load
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('no-motion')
}
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
  document.documentElement.classList.toggle('no-motion', e.matches)
})

// Modern typography
const fontLink = document.createElement('link')
fontLink.rel = 'stylesheet'
fontLink.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&display=swap'
document.head.appendChild(fontLink)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <a href="#main-content" className="skip-nav">Skip to content</a>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>,
)
