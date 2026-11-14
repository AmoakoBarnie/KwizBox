/**
 * KwizBox CI smoke test — security hardening checks.
 *
 * No browser required. Hits the backend API directly (Node 18+ global fetch)
 * and asserts:
 *   1. register/login/guest set an HttpOnly, Secure, SameSite=Strict cookie
 *      instead of returning a JWT in the response body / localStorage.
 *   2. /auth/me works via the cookie (no Authorization bearer token).
 *   3. Security headers are present (X-Content-Type-Options, Referrer-Policy,
 *      CSP, Strict-Transport-Security, etc.) on a normal response.
 *   4. Rate limiting kicks in (limit exceeded → 429 Too Many Requests).
 *   5. /admin/token requires the admin credentials.
 *
 * Run locally (backend must be up):
 *   KWIZBOX_TEST_URL=http://127.0.0.1:8001 node frontend/tests/smoke-auth.mjs
 *
 * CI:
 *   node frontend/tests/smoke-auth.mjs
 */
import assert from 'node:assert/strict';

const BASE = process.env.KWIZBOX_TEST_URL || 'http://127.0.0.1:8001';
const failures = [];
let passed = 0;

function check(name, cond, extra = '') {
  if (cond) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL  ${name}  ${extra}`);
  }
}

// ---- tiny cookie jar (Node fetch does not manage cookies for us) ----
const cookieJar = new Map();
function addCookies(setCookieHeader) {
  if (!setCookieHeader) return;
  for (const part of setCookieHeader.split(',')) {
    const [name, ...rest] = part.split(';');
    const value = rest.map(r => r.trim()).join(';').trim();
    cookieJar.set(name.trim(), decodeURIComponent(value));
  }
}

async function request(method, path, body) {
  const headers = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    if (Array.isArray(body)) headers['Content-Type'] = 'application/json';
  }
  if (cookieJar.size) headers.Cookie = Array.from(cookieJar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  addCookies(res.headers.get('set-cookie'));
  return res;
}

// ---- 1. Register → HttpOnly + Secure + SameSite cookie + /auth/me via cookie ----
console.log('auth: register + cookie');
{
  const nick = `ci_e2e_${Date.now()}`;
  const res = await request('POST', '/auth/register', {
    nickname: nick,
    password: 'TestPass123!',
    class_level: 'B4',
    school_code: '',
    security_question: 'pet',
    security_answer: 'dog',
  });
  check('register 200', res.status === 200, `got ${res.status}`);
  const setCookie = res.headers.get('set-cookie') || '';
  check('set-cookie returned', /kwizbox_access/.test(setCookie), setCookie || '');
  check('cookie HttpOnly', /httponly/i.test(setCookie), setCookie);
  check('cookie Secure', /secure/i.test(setCookie), setCookie);
  check('cookie SameSite=Strict', /samesite\s*=\s*strict/i.test(setCookie), setCookie);
  const body = await res.json();
  check('response has user', !!body.user, JSON.stringify(body).slice(0, 80));
  const me = await request('GET', '/auth/me');
  check('me via cookie 200', me.status === 200, `got ${me.status}`);
  const meBody = await me.json();
  check('me.nickname matches', meBody.nickname === nick, meBody.nickname || '');
  check('me.is_guest false', meBody.is_guest === false, '');
}

// ---- 2. Login → cookie ----
console.log('auth: login + cookie');
{
  const nickname = `ci_e2e_${Date.now()}`;
  await request('POST', '/auth/register', {
    nickname: nickname,
    password: 'TestPass123!',
    class_level: 'B4',
    school_code: '',
    security_question: 'pet',
    security_answer: 'dog',
  });
  const res = await request('POST', '/auth/login', {
    nickname,
    password: 'TestPass123!',
  });
  check('login 200', res.status === 200, `got ${res.status}`);
  const setCookie = res.headers.get('set-cookie') || '';
  check('login set-cookie HttpOnly', /httponly/i.test(setCookie));
  check('login set-cookie Secure', /secure/i.test(setCookie));
  // No token in the response body (cookie only)
  const body = await res.json();
  check('no JWT in body', !body.access_token && !body.token, JSON.stringify(body).slice(0, 80));
}

// ---- 3. Guest mode → cookie ----
console.log('auth: guest + cookie');
{
  const res = await request('POST', '/auth/guest', {
    nickname: 'GuestCI',
    class_level: 'B6',
    school_code: '',
  });
  check('guest 200', res.status === 200, `got ${res.status}`);
  const setCookie = res.headers.get('set-cookie') || '';
  check('guest set-cookie HttpOnly', /httponly/i.test(setCookie));
  check('guest set-cookie Secure', /secure/i.test(setCookie));
  const body = await res.json();
  check('guest returns user', !!body.user, '');
}
// ---- 4. /auth/me without cookie returns 401 ----
console.log('auth: me without cookie');
{
  const res = await fetch(BASE + '/auth/me', { headers: {} });
  check('me without cookie 401', res.status === 401, `got ${res.status}`);
}

// ---- 5. Security headers on /health ----
console.log('security headers: /health');
{
  const res = await request('GET', '/health');
  const h = res.headers;
  check('X-Content-Type-Options: nosniff', h.get('x-content-type-options') === 'nosniff', h.get('x-content-type-options') || '');
  check('Referrer-Policy set', typeof h.get('referrer-policy') === 'string' && h.get('referrer-policy').length > 0, h.get('referrer-policy') || '');
  check('CSP present', typeof h.get('content-security-policy') === 'string' && h.get('content-security-policy').length > 0, (h.get('content-security-policy') || '').slice(0, 60));
  const csp = h.get('content-security-policy') || '';
  check('CSP allows blob textures', /img-src[^;]*blob:/.test(csp) && /connect-src[^;]*blob:/.test(csp), csp);
  check('CSP allows Google fonts', /style-src[^;]*fonts\.googleapis\.com/.test(csp) && /font-src[^;]*fonts\.gstatic\.com/.test(csp), csp);
  check('Strict-Transport-Security present', typeof h.get('strict-transport-security') === 'string', h.get('strict-transport-security') || '');
  check('X-Frame-Options DENY', h.get('x-frame-options') === 'DENY', h.get('x-frame-options') || '');
  check('Permissions-Policy present', typeof h.get('permissions-policy') === 'string', (h.get('permissions-policy') || '').slice(0, 60));
  check('COOP present', typeof h.get('cross-origin-opener-policy') === 'string', (h.get('cross-origin-opener-policy') || '').slice(0, 60));
}

// ---- 6. Rate limiting: exceed /auth/register (limit 10/minute) → 429 ----
console.log('rate limit: /auth/register (10/min → 429)');
{
  const nick = `ci_rl_${Date.now()}`;
  let ok = true;
  for (let i = 0; i < 15; i += 1) {
    const r = await request('POST', '/auth/register', {
      nickname: nick,
      password: 'TestPass123!',
      class_level: 'B4',
      school_code: '',
      security_question: 'pet',
      security_answer: 'dog',
    });
    if (r.status !== 429) ok = false; // too slow to get 429 → caller must wait
  }
  // Rate limit is 10/minute; within a couple of seconds the 11th rapid request
// must be throttled (429 Too Many Requests). Stop on the first 429 we see.
let got429 = false;
const rlNick = `ci_rl_${Date.now()}`;
for (let i = 0; i < 12; i += 1) {
  const r = await request('POST', '/auth/register', {
    nickname: rlNick,
    password: 'TestPass123!',
    class_level: 'B4',
    school_code: '',
    security_question: 'pet',
    security_answer: 'dog',
  });
  if (r.status === 429) { got429 = true; break; }
}
check('rapid register calls throttled (429 seen)', got429, 'rate limiter not enforcing within window');
}

// ---- 7. Rate limiting: exceed /quiz/check (limit 30/min → 429) ----
console.log('rate limit: /quiz/check (30/min → 429)');
{
  // check_answer uses optional_user (guest OK); burst 35 rapid calls → 429 on 31st.
  const qid = 1;
  let got429 = false;
  for (let i = 0; i < 35; i += 1) {
    const r = await request('POST', '/quiz/check', {
      question_id: qid,
      selected_index: 0,
    });
    if (r.status === 429) { got429 = true; break; }
  }
  check('rapid /quiz/check throttled (429 seen)', got429, 'rate limiter not enforcing /quiz/check within window');
}

// ---- 8. /admin/token bad creds → 401 ----
console.log('admin: /admin/token bad creds');
{
  const res = await request('POST', '/admin/token', {
    username: 'admin',
    password: 'WrongPass!',
  });
  check('admin/token 401', res.status === 401, `got ${res.status}`);
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  console.error('FAILURES:\n  ' + failures.join('\n  '));
  process.exit(1);
}
console.log('Smoke test passed.');
