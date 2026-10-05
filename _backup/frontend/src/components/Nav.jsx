import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Logo from './Logo.jsx'

const LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Subjects', href: '#subjects' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Sign up', href: '#signup' },
]

export default function Nav({ onCta }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  function close() { setOpen(false) }

  return (
    <nav className={`nav${scrolled ? ' nav-solid' : ''}`} aria-label="Main">
      <div className="nav-inner">
        <Logo />
        <button
          className="hamburger"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>
        <ul className={`nav-links${open ? ' nav-links-open' : ''}`}>
          {LINKS.map((l) => (
            <li key={l.href}>
              {l.href === '#signup' ? (
                <button className="btn primary nav-cta" onClick={() => { onCta?.(); close() }}>
                  {l.label}
                </button>
              ) : (
                <Link to={l.href} onClick={close}>{l.label}</Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}