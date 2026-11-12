/**
 * Live duel client.
 *
 * A duel is just a friend challenge with a display-only WebSocket room keyed by
 * the 6-character challenge code. The socket relays who is in the room and how
 * far they have got; it never carries answers and never decides the result —
 * `/quiz/challenge/{code}/submit` remains the server-authoritative score.
 *
 * The hook owns the connection and reconnects with capped exponential backoff
 * (phones lose signal; a duel should not need a page reload to recover).
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const RETRY_BASE_MS = 1000
const RETRY_MAX_MS = 15000

export function duelSocketUrl(code, nickname) {
  const raw = import.meta.env.VITE_API_URL
  let origin = ''
  if (raw) {
    try {
      const url = new URL(raw, window.location.origin)
      origin = `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`
    } catch (_) { /* fall back to the current origin */ }
  }
  if (!origin) {
    origin = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
  }
  return `${origin}/ws/duel/${encodeURIComponent(String(code).toUpperCase())}` +
    `?nickname=${encodeURIComponent(nickname || 'Player')}`
}

/**
 * Join the room for `code` as `nickname`.
 *
 * Returns:
 *   status   'idle' | 'connecting' | 'open' | 'closed'
 *   players  nicknames currently connected (including you)
 *   opponent the first other player's latest display state, or null
 *   sendProgress / sendFinished — safe no-ops while disconnected
 */
export function useDuelRoom(code, nickname) {
  const [status, setStatus] = useState('idle')
  const [players, setPlayers] = useState([])
  const [opponent, setOpponent] = useState(null)
  const wsRef = useRef(null)
  const retryRef = useRef(0)
  const aliveRef = useRef(false)
  const nicknameRef = useRef(nickname)
  nicknameRef.current = nickname

  useEffect(() => {
    if (!code || !nickname) {
      setStatus('idle')
      setPlayers([])
      setOpponent(null)
      return undefined
    }

    aliveRef.current = true
    let retryTimer = null

    const connect = () => {
      if (!aliveRef.current) return
      setStatus('connecting')
      let ws
      try {
        ws = new WebSocket(duelSocketUrl(code, nicknameRef.current))
      } catch (_) {
        setStatus('closed')
        return
      }
      wsRef.current = ws

      ws.onopen = () => {
        retryRef.current = 0
        setStatus('open')
      }

      ws.onmessage = (event) => {
        let data
        try { data = JSON.parse(event.data) } catch (_) { return }
        if (!data || typeof data !== 'object') return

        if (data.type === 'joined') {
          setPlayers(Array.isArray(data.players) ? data.players : [])
          const peer = (data.peers || []).find((p) => p?.nickname !== nicknameRef.current)
          setOpponent(peer ? { nickname: peer.nickname, ...(peer.progress || {}) } : null)
        } else if (data.type === 'presence') {
          setPlayers(Array.isArray(data.players) ? data.players : [])
        } else if (data.type === 'progress' || data.type === 'finished') {
          if (data.nickname === nicknameRef.current) return
          setOpponent((prev) => ({
            ...(prev || {}),
            ...data,
            finished: data.type === 'finished' ? true : (data.finished ?? prev?.finished ?? false),
          }))
        } else if (data.type === 'left') {
          setOpponent((prev) => (prev?.nickname === data.nickname ? null : prev))
        }
      }

      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null
        if (!aliveRef.current) return
        setStatus('closed')
        const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** retryRef.current)
        retryRef.current = Math.min(retryRef.current + 1, 5)
        retryTimer = setTimeout(connect, delay)
      }

      ws.onerror = () => { try { ws.close() } catch (_) {} }
    }

    connect()
    return () => {
      aliveRef.current = false
      if (retryTimer) clearTimeout(retryTimer)
      const ws = wsRef.current
      wsRef.current = null
      if (ws) { try { ws.close() } catch (_) {} }
    }
  }, [code, nickname])

  const send = useCallback((payload) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return false
    try {
      ws.send(JSON.stringify(payload))
      return true
    } catch (_) {
      return false
    }
  }, [])

  const sendProgress = useCallback((progress) => send({ type: 'progress', ...progress }), [send])
  const sendFinished = useCallback((result) => send({ type: 'finished', ...result }), [send])

  return { status, players, opponent, send, sendProgress, sendFinished }
}
