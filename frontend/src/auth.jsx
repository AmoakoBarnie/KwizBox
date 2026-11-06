import { createContext, useContext, useEffect, useState } from 'react'
import { api } from './api.js'

const AuthContext = createContext(null)

const TOKEN_KEY = 'kwizbox_token'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount, validate the session (cookies are read server-side, never by JS).
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const me = await api.me()
        if (active) setUser(me)
      } catch (_) {
        if (active) setUser(null)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  function persist(usr) {
    setUser(usr)
    setToken(null)
  }

  const value = {
    user, token, loading,
    isAuthed: !!user && !user.is_guest,
    isGuest: !!user && user.is_guest,
    async register(data) { const r = await api.register(data); persist(r.user); return r },
    async login(data) { const r = await api.login(data); persist(r.user); return r },
    async guestLogin(data) { const r = await api.guest(data); persist(r.user); return r },
    logout() { persist(null, null) },
    // Upgrade 8: update avatar customization
    async updateAvatar(data) {
      const r = await api.updateAvatar(data)
      if (r) persist(r)
      return r
    },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
