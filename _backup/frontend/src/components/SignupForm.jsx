import { useState, useEffect } from 'react'

const STORAGE_KEY = 'kwizbox-email'

function isValidWorkEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function SignupForm({ onSuccess }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Persist success across forms on the same page
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setSuccess(saved)
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Enter your email.'); return }
    if (!isValidWorkEmail(email.trim())) { setError('Use a valid work email.'); return }
    setSuccess(email.trim())
    localStorage.setItem(STORAGE_KEY, email.trim())
    onSuccess?.(email.trim())
  }

  if (success) {
    return (
      <p className="signup-success" role="status">
        ✓ You're on the list — we'll send updates to <b>{success}</b>.
      </p>
    )
  }

  return (
    <form className="signup-form" onSubmit={handleSubmit} noValidate>
      <label htmlFor="signup-email" className="sr-only">Work email</label>
      <input
        id="signup-email"
        type="email"
        inputMode="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setError('') }}
        aria-invalid={!!error}
        aria-describedby={error ? 'signup-error' : undefined}
        disabled={!!success}
      />
      <button type="submit" className="btn primary" disabled={!!success}>Get started</button>
      {error && <p id="signup-error" className="err" role="alert">{error}</p>}
    </form>
  )
}