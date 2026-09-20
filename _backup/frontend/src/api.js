// Thin API client. Talks to the backend via the Vite /api proxy in dev,
// and directly in prod (set VITE_API_URL to the backend origin).
const BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : ''

/** Resolve a question image_url so /media/... hits the API (Vite proxies /media in dev). */
export function mediaUrl(path) {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const rel = path.startsWith('/') ? path : `/${path}`
  const raw = import.meta.env.VITE_API_URL
  if (raw) {
    const origin = raw.replace(/\/$/, '').replace(/\/api$/, '')
    return `${origin}${rel}`
  }
  return rel
}

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
  avatar: (data, token) => request('PATCH', '/auth/me/avatar', data, token),
  resetQuestion: (data) => request('POST', '/auth/reset/question', data),
  resetVerify: (data) => request('POST', '/auth/reset/verify', data),
  updateAvatar: (data, token) => request('PATCH', '/auth/me/avatar', data, token),
  curriculum: {
    manifest: () => request('GET', '/curriculum/manifest'),
    topics: () => request('GET', '/curriculum/topics'),
  },
  securityQuestions: [
    "What is your favourite subject in school?",
    "What is the name of your best friend?",
    "What is your favourite Ghanaian food?",
    "What is the name of your school?",
    "What is your favourite colour?",
    "What is your mother's first name?",
    "What is your favourite animal?",
    "What town or village were you born in?",
  ],
  pack: (data, token) => request('POST', '/quiz/pack', data, token),
  check: (data, token) => request('POST', '/quiz/check', data, token),
  submit: (data, token) => request('POST', '/quiz/submit', data, token),
  leaderboard: (params) => request('GET', `/quiz/leaderboard?${new URLSearchParams(params)}`),
  me: (token) => request('GET', '/auth/me', undefined, token),
  changePassword: (data, token) => request('PUT', '/auth/me/password', data, token),
  deleteAccount: (data, token) => request('DELETE', '/auth/me', data, token),
  challenge: {
    create: (data, token) => request('POST', '/quiz/challenge/create', data, token),
    join: (code, token) => request('POST', `/quiz/challenge/${code}/join`, undefined, token),
    compare: (code) => request('GET', `/quiz/challenge/${code}/compare`),
    questions: (code, token) => request('GET', `/quiz/challenge/${code}/questions`, undefined, token),
    submit: (data, token) => request('POST', `/quiz/challenge/${data.code}/submit`, data, token),
    submitScore: (code, answers, duration_seconds, max_streak, token) => request('POST', `/quiz/challenge/${code}/submit`, { answers, duration_seconds, max_streak }, token),
  },

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
    cleanupGuests: (params, token) => request('DELETE', `/admin/cleanup/guests?${new URLSearchParams(params || {})}`, undefined, token),
    settings: (token) => request('GET', '/admin/settings', undefined, token),
    updateSetting: (key, data, token) => request('PUT', `/admin/settings/${key}`, data, token),
    audit: (token) => request('GET', '/admin/audit', undefined, token),
    admins: (token) => request('GET', '/admin/admins', undefined, token),
    createAdmin: (data, token) => request('POST', '/admin/admins', data, token),
    exportUrl: (kind) => `${BASE}/admin/export/${kind}`,
  },
}
