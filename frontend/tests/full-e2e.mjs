/**
 * Full-app end-to-end smoke — comprehensive user journey.
 * Covers: auth (cookie), security headers, rate limits, quiz, admin, challenge.
 * Run against a live backend (BASE default http://127.0.0.1:8001).
 */
import assert from 'node:assert/strict';

const BASE = process.env.KWIZBOX_TEST_URL || 'http://127.0.0.1:8001';
const failures = [];
let passed = 0;

function check(name, cond, extra = '') {
  if (cond) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failures.push(name); console.log(`  FAIL  ${name}  ${extra}`); }
}

// tiny cookie jar + reusable request with cookie
const cookieJar = new Map();
function addCookies(h) {
  if (!h) return;
  for (const part of h.split(',')) {
    const [name, ...rest] = part.split(';');
    cookieJar.set(name.trim(), decodeURIComponent(rest.map(r => r.trim()).join(';').trim()));
  }
}
async function request(method, path, body) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookieJar.size) headers['Cookie'] = Array.from(cookieJar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (res.headers.get('set-cookie')) addCookies(res.headers.get('set-cookie'));
  return res;
}

const NICK = `fullci_${Date.now()}`;

// ---- 1. Register (cookie) ----
console.log('1. register + cookie');
{
  const r = await request('POST', '/auth/register', {
    nickname: NICK, password: 'TestPass123!', class_level: 'B4', school_code: '', security_question: 'pet', security_answer: 'dog',
  });
  check('register 200', r.status === 200, `got ${r.status}`);
  const setCookie = r.headers.get('set-cookie') || '';
  check('cookie HttpOnly', /httponly/i.test(setCookie));
  check('cookie Secure', /secure/i.test(setCookie));
  check('cookie SameSite=Strict', /samesite\s*=\s*strict/i.test(setCookie));
  const body = await r.json();
  check('register returns user', !!(body.user || body.detail), JSON.stringify(body).slice(0, 80));
}

// ---- 2. Login (cookie) ----
console.log('2. login + cookie');
{
  const r = await request('POST', '/auth/login', { nickname: NICK, password: 'TestPass123!' });
  check('login 200', r.status === 200, `got ${r.status}`);
  const setCookie = r.headers.get('set-cookie') || '';
  check('login cookie HttpOnly', /httponly/i.test(setCookie));
  const body = await r.json();
  check('login body has no JWT', !body.access_token && !body.token, JSON.stringify(body).slice(0, 80));
}

// ---- 3. /auth/me via cookie ----
console.log('3. /auth/me via cookie');
{
  const m = await request('GET', '/auth/me');
  check('me 200', m.status === 200, `got ${m.status}`);
  const mb = await m.json();
  check('me.nickname matches', mb.nickname === NICK, JSON.stringify(mb).slice(0, 80));
  check('me.is_guest false', mb.is_guest === false, JSON.stringify(mb).slice(0, 80));
}

// ---- 4. Guest ----
console.log('4. guest');
{
  const g = await request('POST', '/auth/guest', { nickname: 'GuestCI', class_level: 'B6', school_code: '' });
  check('guest 200', g.status === 200, `got ${g.status}`);
  const gb = await g.json();
  check('guest user.is_guest true', (gb.user || gb).is_guest === true, JSON.stringify(gb).slice(0, 80));
}

// ---- 5. /auth/me without cookie → 401 ----
console.log('5. me without cookie');
{
  const m = await fetch(BASE + '/auth/me', { method: 'GET', headers: {} });
  check('me without cookie 401', m.status === 401, `got ${m.status}`);
}

// ---- 6. Security headers ----
console.log('6. security headers');
{
  const h = await (await fetch(BASE + '/health')).headers;
  check('X-Content-Type-Options: nosniff', h.get('x-content-type-options') === 'nosniff', h.get('x-content-type-options') || '');
  check('Referrer-Policy set', typeof h.get('referrer-policy') === 'string' && h.get('referrer-policy').length > 0, h.get('referrer-policy') || '');
  check('CSP present', typeof h.get('content-security-policy') === 'string' && h.get('content-security-policy').length > 0, h.get('content-security-policy')?.slice(0, 60) || '');
  check('HSTS present', typeof h.get('strict-transport-security') === 'string', h.get('strict-transport-security') || '');
  check('X-Frame-Options DENY', h.get('x-frame-options') === 'DENY', h.get('x-frame-options') || '');
  check('Permissions-Policy set', typeof h.get('permissions-policy') === 'string', h.get('permissions-policy') || '');
  check('COOP set', typeof h.get('cross-origin-opener-policy') === 'string', h.get('cross-origin-opener-policy') || '');
}

// ---- 7. Rate limits (check burst uses the authenticated cookie) ----
console.log('7. rate limits');
{
  // register burst (10/min) → 429
  let got429 = false;
  for (let i = 0; i < 15; i += 1) {
    const rr = await fetch(BASE + '/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: `rl_${Date.now()}_${i}`, password: 'TestPass123!', class_level: 'B4', school_code: '', security_question: 'pet', security_answer: 'dog' }),
    });
    if (rr.status === 429) { got429 = true; break; }
  }
  check('register burst → 429', got429, 'no 429 in 15 rapid calls');

  // admin token bad creds → 401 (rate-limit + auth protection on admin)
  const atbad = await request('POST', '/admin/token', { username: process.env.KWIZBOX_ADMIN_USERNAME || 'admin', password: 'WrongPass!' });
  check('admin token bad creds 401', atbad.status === 401, `got ${atbad.status}`);
}

// ---- 8. Quiz pack ----
console.log('8. quiz pack');
{
  const p = await request('POST', '/quiz/pack', { class_level: 'B4', subject: 'Mathematics', count: 3 });
  check('pack 200', p.status === 200, `got ${p.status}`);
  const pb = await p.json();
  check('pack returns questions array', Array.isArray(pb), JSON.stringify(pb).slice(0, 100));
}

// ---- 9. Quiz check (cookie auth) ----
console.log('9. quiz check');
{
  const pc = await request('POST', '/quiz/check', { question_id: 1, selected_index: 0 });
  check('check 200', pc.status === 200, `got ${pc.status}`);
  const pcb = await pc.json();
  check('check returns is_correct', typeof pcb.is_correct === 'boolean', JSON.stringify(pcb).slice(0, 80));
}

// ---- 10. Admin token ----
console.log('10. admin token');
{
  // Never hardcode the admin password in the repo. Supply it via
  // KWIZBOX_ADMIN_PASSWORD (+ optional KWIZBOX_ADMIN_USERNAME); without it the
  // credential checks fail with a clear hint instead of silently using a value.
  const adminUser = process.env.KWIZBOX_ADMIN_USERNAME || 'admin';
  const adminPass = process.env.KWIZBOX_ADMIN_PASSWORD;
  if (!adminPass) console.log('  (set KWIZBOX_ADMIN_PASSWORD to run the admin credential checks)');
  const t1 = adminPass
    ? await request('POST', '/admin/token', { username: adminUser, password: adminPass })
    : { status: 0, json: async () => ({}) };
  check('admin token good creds 200', t1.status === 200,
        adminPass ? `got ${t1.status}` : 'KWIZBOX_ADMIN_PASSWORD not set');
  const tb = await t1.json();
  check('admin token body has token', !!(tb.access_token || tb.token), JSON.stringify(tb).slice(0, 80));
  const t2 = await request('POST', '/admin/token', { username: adminUser, password: 'WrongPass!' });
  check('admin token bad creds 401', t2.status === 401, `got ${t2.status}`);
}

// ---- 11. Challenge flow ----
console.log('11. challenge flow');
{
  const cd = await request('POST', '/quiz/challenge/create', { class_level: 'B4', subject: 'Mathematics' });
  check('create 200', cd.status === 200, `got ${cd.status}`);
  const cb = await cd.json();
  check('create has code (6 letters)', typeof cb.code === 'string' && cb.code.length === 6, cb.code || '');

  const q = await request('GET', `/quiz/challenge/${cb.code}/questions`);
  check('questions 200', q.status === 200, `got ${q.status}`);
  const qb = await q.json();
  const qids = Array.isArray(qb) ? qb.map(x => x.id) : (qb.questions || []).map(x => x.id);
  check('questions has 12 ids', Array.isArray(qids) && qids.length === 12, `got ${qids?.length}`);

  const sub = await request('POST', `/quiz/challenge/${cb.code}/submit`, [{ question_id: qids[0], selected_index: 0 }]);
  check('submit 200', sub.status === 200, `got ${sub.status}`);
  const sb = await sub.json();
  check('submit returns score', typeof sb.score === 'number', JSON.stringify(sb).slice(0, 80));

  const cmp = await request('GET', `/quiz/challenge/${cb.code}/compare`);
  check('compare 200', cmp.status === 200, `got ${cmp.status}`);
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) { console.error('FAILURES:\n' + failures.join('\n')); process.exit(1); }
console.log('FULL APP END-TO-END PASSED');
