import { createContext, useContext, useEffect, useState } from 'react'
import { api } from './api.js'

const AuthContext = createContext(null)

const TOKEN_KEY = 'kwizbox_token'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [loading, setLoading] = useState(true)

  // On mount, validate stored token
  useEffect(() => {
    let active = true
    async function load() {
      if (!token) { setLoading(false); return }
      try {
        const me = await api.me(token)
        if (active) setUser(me)
      } catch (_) {
        localStorage.removeItem(TOKEN_KEY)
        if (active) setToken(null)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [token])

  function persist(tok, usr) {
    if (tok) localStorage.setItem(TOKEN_KEY, tok)
    else localStorage.removeItem(TOKEN_KEY)
    setToken(tok)
    setUser(usr)
  }

  const value = {
    user, token, loading,
    isAuthed: !!user && !user.is_guest,
    isGuest: !!user && user.is_guest,
    async register(data) { const r = await api.register(data); persist(r.access_token, r.user); return r },
    async login(data) { const r = await api.login(data); persist(r.access_token, r.user); return r },
    async guestLogin(data) { const r = await api.guest(data); persist(r.access_token, r.user); return r },
    logout() { persist(null, null) },
    // Upgrade 8: update avatar customization
    async updateAvatar(data) {
      const r = await api.updateAvatar(data, token)
      if (r) persist(token, r)
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
