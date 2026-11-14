/**
 * Verify the policy pages state facts that match the code.
 *
 * Each check pairs a claim in the rendered page with something verifiable in the
 * app. A policy that says "no cookies" while the app sets one is the failure mode
 * this guards against.
 */
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5174';
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();
const results = [];
const check = (ok, msg) => { results.push(ok); console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${msg}`); };

async function text(path) {
  await page.goto(BASE + path, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1200);
  return page.evaluate(() => document.querySelector('.policy-body')?.textContent.replace(/\s+/g, ' ') || '');
}

try {
  const priv = await text('/privacy-policy');
  const cook = await text('/cookie-policy');
  const term = await text('/terms-and-conditions');

  console.log('Privacy Policy:');
  check(/IP address/.test(priv), 'discloses IP address collection (last_ip is stored)');
  check(/age/.test(priv) && /sex/.test(priv), 'discloses age + sex collection');
  check(/guest session/i.test(priv) && /does.*create a record/i.test(priv), 'corrects the old "guests store nothing" claim');
  check(/bcrypt/.test(priv), 'says passwords are bcrypt-hashed');
  check(/30 days/.test(priv), 'states the real 30-day token expiry');
  check(/2 hours/.test(priv), 'states the real 2-hour admin token expiry');
  check(/HttpOnly/.test(priv) && /kwizbox_access/.test(priv), 'describes the real HttpOnly session cookie');
  check(!/No cookies of any kind/.test(priv), 'does not claim that no cookie is set');
  check(/SQLite/.test(priv) && !/PostgreSQL/.test(priv), 'states SQLite storage and no pending Postgres move');

  console.log('');
  console.log('Cookie Policy:');
  check(/one essential first-party cookie/i.test(cook), 'states the single essential first-party cookie');
  check(/kwizbox_access/.test(cook), 'names the real session cookie');
  check(/HttpOnly/.test(cook), 'documents HttpOnly');
  check(/SameSite=Strict/.test(cook), 'documents SameSite=Strict');
  check(/stem_mode/.test(cook), 'names the real theme key');
  check(/stem_mute/.test(cook), 'names the real sound key');
  check(/app_mode/.test(cook), 'documents app_mode as the colour-mode fallback');
  check(/ghana_admin_token/.test(cook), 'names the real admin token key');
  check(/kwizbox-offline-practice/.test(cook), 'documents the IndexedDB store');
  check(/kwizbox_offline_practice_pack/.test(cook), 'documents the localStorage fallback');
  check(/kwizbox-offline-media/.test(cook), 'documents the media cache');
  check(!/kwizbox_token/.test(cook), 'no longer claims the removed localStorage token');
  check(!/kwizbox_admin_token/.test(cook), 'no longer claims the non-existent admin key');
  check(!/sets no cookies/i.test(cook), 'does not claim that no cookies are set');

  console.log('');
  console.log('Terms:');
  check(/B4/.test(term) && /S3/.test(term), 'states the real B4–S3 range');
  check(/STEM/.test(term), 'describes the subject coverage');
  check(/no paid tier/.test(term) && /no advertising/.test(term), 'states no payment/ads');
  check(/delete your account/i.test(term), 'explains account deletion');
  check(/Privacy Policy/.test(term) && /Cookies and Tracking Policy/.test(term), 'cross-references the other policies');
  check(/parent or guardian/.test(term), 'addresses minors');
  check(/SHS 3/.test(term) || /S3/.test(term), 'covers senior high, not just JHS');
} catch (e) {
  check(false, e.message);
}

await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
