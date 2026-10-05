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
  health: () => request('GET', '/api/health'),
  register: (data) => request('POST', '/api/auth/register', data),
  login: (data) => request('POST', '/api/auth/login', data),
  guest: (data) => request('POST', '/api/auth/guest', data),
  avatar: (data, token) => request('PATCH', '/api/auth/me/avatar', data, token),
  resetQuestion: (data) => request('POST', '/api/auth/reset/question', data),
  resetVerify: (data) => request('POST', '/api/auth/reset/verify', data),
  updateAvatar: (data, token) => request('PATCH', '/api/auth/me/avatar', data, token),
  curriculum: {
    manifest: () => request('GET', '/api/curriculum/manifest'),
    topics: () => request('GET', '/api/curriculum/topics'),
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
  pack: (data, token) => request('POST', '/api/quiz/pack', data, token),
  check: (data, token) => request('POST', '/api/quiz/check', data, token),
  submit: (data, token) => request('POST', '/api/quiz/submit', data, token),
  leaderboard: (params) => request('GET', `/api/quiz/leaderboard?${new URLSearchParams(params)}`),
  me: (token) => request('GET', '/api/auth/me', undefined, token),
  changePassword: (data, token) => request('PUT', '/api/auth/me/password', data, token),
  deleteAccount: (data, token) => request('DELETE', '/api/auth/me', data, token),
  challenge: {
    create: (data, token) => request('POST', '/api/quiz/challenge/create', data, token),
    join: (code, token) => request('POST', `/api/quiz/challenge/${code}/join`, undefined, token),
    compare: (code) => request('GET', `/api/quiz/challenge/${code}/compare`),
    questions: (code, token) => request('GET', `/api/quiz/challenge/${code}/questions`, undefined, token),
    submit: (data, token) => request('POST', `/api/quiz/challenge/${data.code}/submit`, data, token),
    submitScore: (code, answers, duration_seconds, max_streak, token) => request('POST', `/api/quiz/challenge/${code}/submit`, { answers, duration_seconds, max_streak }, token),
  },

  // ---- Admin ----
  admin: {
    login: (data) => request('POST', '/api/admin/token', data),
    me: (token) => request('GET', '/api/admin/me', undefined, token),
    dashboard: (token) => request('GET', '/api/admin/dashboard', undefined, token),
    users: (params, token) => request('GET', `/api/admin/users?${new URLSearchParams(params || {})}`, undefined, token),
    userDetail: (id, token) => request('GET', `/api/admin/users/${id}`, undefined, token),
    setUserStatus: (id, data, token) => request('POST', `/api/admin/users/${id}/status`, data, token),
    questions: (params, token) => request('GET', `/api/admin/questions?${new URLSearchParams(params || {})}`, undefined, token),
    createQuestion: (data, token) => request('POST', '/api/admin/questions', data, token),
    updateQuestion: (id, data, token) => request('PUT', `/api/admin/questions/${id}`, data, token),
    deleteQuestion: (id, token) => request('DELETE', `/api/admin/questions/${id}`, undefined, token),
    setQuestionActive: (id, data, token) => request('POST', `/api/admin/questions/${id}/active`, data, token),
    schoolCodes: (token) => request('GET', '/api/admin/school-codes', undefined, token),
    createSchoolCodes: (data, token) => request('POST', '/api/admin/school-codes', data, token),
    updateSchoolCode: (id, data, token) => request('PATCH', `/api/admin/school-codes/${id}`, data, token),
    leaderboard: (params, token) => request('GET', `/api/admin/leaderboard?${new URLSearchParams(params || {})}`, undefined, token),
    monitor: (token) => request('GET', '/api/admin/monitor', undefined, token),
    cleanupGuests: (params, token) => request('DELETE', `/api/admin/cleanup/guests?${new URLSearchParams(params || {})}`, undefined, token),
    settings: (token) => request('GET', '/api/admin/settings', undefined, token),
    updateSetting: (key, data, token) => request('PUT', `/api/admin/settings/${key}`, data, token),
    audit: (token) => request('GET', '/api/admin/audit', undefined, token),
    admins: (token) => request('GET', '/api/admin/admins', undefined, token),
    createAdmin: (data, token) => request('POST', '/api/admin/admins/create', data, token),
    exportUrl: (kind) => `${BASE}/api/admin/export/${kind}`,
  },
}
