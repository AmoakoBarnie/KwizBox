// Thin API client. Talks to the backend via the Vite /api proxy in dev,
// and directly in prod (set VITE_API_URL to the backend origin).
const BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '/api'

async function request(method, path, body, token) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try { detail = (await res.json()).detail || detail } catch (_) {}
    throw new Error(detail)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  health: () => request('GET', '/health'),
  register: (data) => request('POST', '/auth/register', data),
  login: (data) => request('POST', '/auth/login', data),
  guest: (data) => request('POST', '/auth/guest', data),
  me: (token) => request('GET', '/auth/me', undefined, token),
  pack: (data) => request('POST', '/quiz/pack', data),
  submit: (data, token) => request('POST', '/quiz/submit', data, token),
  leaderboard: (params) => request('GET', `/quiz/leaderboard?${new URLSearchParams(params)}`),

  // ---- Admin ----
  admin: {
    login: (data) => request('POST', '/admin/token', data),
    me: (token) => request('GET', '/admin/me', undefined, token),
    dashboard: (token) => request('GET', '/admin/dashboard', undefined, token),
    users: (params, token) => request('GET', `/admin/users?${new URLSearchParams(params || {})}`, undefined, token),
    userDetail: (id, token) => request('GET', `/admin/users/${id}`, undefined, token),
    setUserStatus: (id, data, token) => request('POST', `/admin/users/${id}/status`, data, token),
    questions: (params, token) => request('GET', `/admin/questions?${new URLSearchParams(params || {})}`, undefined, token),
    createQuestion: (data, token) => request('POST', '/admin/questions', data, token),
    updateQuestion: (id, data, token) => request('PUT', `/admin/questions/${id}`, data, token),
    deleteQuestion: (id, token) => request('DELETE', `/admin/questions/${id}`, undefined, token),
    setQuestionActive: (id, data, token) => request('POST', `/admin/questions/${id}/active`, data, token),
    schoolCodes: (token) => request('GET', '/admin/school-codes', undefined, token),
    createSchoolCodes: (data, token) => request('POST', '/admin/school-codes', data, token),
    updateSchoolCode: (id, data, token) => request('PATCH', `/admin/school-codes/${id}`, data, token),
    leaderboard: (params, token) => request('GET', `/admin/leaderboard?${new URLSearchParams(params || {})}`, undefined, token),
    monitor: (token) => request('GET', '/admin/monitor', undefined, token),
    settings: (token) => request('GET', '/admin/settings', undefined, token),
    updateSetting: (key, data, token) => request('PUT', `/admin/settings/${key}`, data, token),
    audit: (token) => request('GET', '/admin/audit', undefined, token),
    admins: (token) => request('GET', '/admin/admins', undefined, token),
    createAdmin: (data, token) => request('POST', '/admin/admins', data, token),
    exportUrl: (kind) => `${BASE}/admin/export/${kind}`,
  },
}
