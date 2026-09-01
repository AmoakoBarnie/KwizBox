import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles.css'

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
      <a href="#main-content" className="skip-nav">Skip to content</a>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
