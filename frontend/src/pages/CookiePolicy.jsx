import { useNavigate } from 'react-router-dom'

export default function CookiePolicy() {
  const nav = useNavigate()
  return (
    <div className="policy-page">
      <div className="policy-hero">
        <h1 className="policy-title">Cookies and Tracking Policy</h1>
        <p className="policy-sub">KwizBox — last updated 13 November 2026</p>
      </div>

      <div className="policy-body">
        <section className="policy-section">
          <h2 className="policy-h2">1. Summary</h2>
          <p>
            <strong>This app sets one essential first-party cookie.</strong> It keeps you
            signed in and is described in section 3. KwizBox does not use tracking
            cookies, analytics cookies, advertising cookies, or third-party cookies, and
            it does not embed third-party tracking scripts. It also uses your browser's
            own storage for a few functional values, which are listed in section 5.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">2. What a cookie is</h2>
          <p>
            A cookie is a small piece of data that a website stores in your browser and that
            the browser sends back to that website with every request. Websites use cookies
            for many things: remembering you are logged in, counting visitors, showing
            relevant ads, and tracking your behaviour across sites.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">3. The one cookie we use</h2>
          <p>
            When you sign up, log in, or start a guest session, the server sets a single
            first-party cookie named <code>kwizbox_access</code>. It contains a signed
            session token (JWT) and exists only to keep you signed in.
          </p>
          <ul className="policy-list">
            <li>
              <strong>Purpose:</strong> authentication — without it the app cannot tell
              which account or guest session is yours.
            </li>
            <li>
              <strong>HttpOnly:</strong> JavaScript cannot read it, which helps protect the
              session from cross-site scripting.
            </li>
            <li>
              <strong>Secure and SameSite=Strict:</strong> it is sent only over HTTPS and is
              not attached to cross-site requests.
            </li>
            <li>
              <strong>Expiry:</strong> 30 days for registered users and guest sessions.
              Logging out, or clearing cookies in your browser, removes it immediately.
            </li>
            <li>
              <strong>No tracking:</strong> the cookie is not used for analytics,
              advertising, profiling, or any purpose other than keeping you signed in.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">4. Cookies we do NOT use</h2>
          <ul className="policy-list">
            <li>
              <strong>No analytics cookies</strong> — we do not use Google Analytics, Meta
              Pixel, Mixpanel, Hotjar, Segment, or any similar service.
            </li>
            <li>
              <strong>No advertising or marketing cookies</strong> — we do not serve ads and
              do not track you for advertising purposes.
            </li>
            <li>
              <strong>No third-party cookies</strong> — no external service is given access
              to set cookies in your browser through this app.
            </li>
            <li>
              <strong>No tracking or fingerprinting</strong> — we do not use device
              fingerprinting, cross-site tracking, or any technique that identifies you
              across websites.
            </li>
            <li>
              <strong>No service worker or PWA tracking</strong> — the app's Progressive Web
              App / service worker feature is disabled, and no service worker is registered.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">5. Browser storage we do use (not cookies)</h2>
          <p>
            The app uses your browser's <code>localStorage</code> — a separate browser
            storage mechanism that is never sent to any server automatically — for purely
            functional purposes. This is <strong>not</strong> a cookie. The following values
            are stored locally on your device:
          </p>
          <ul className="policy-list">
            <li>
              <strong>Last quiz result and configuration</strong>
              (<code>kwizbox_last_result</code>, <code>kwizbox_last_cfg</code>): your most
              recent quiz outcome and the settings used, stored so a refresh does not lose
              it. It is your own result data.
            </li>
            <li>
              <strong>Earned badges</strong> (<code>kwizbox_badges</code>): a list of badges
              you have earned, stored so they persist across sessions.
            </li>
            <li>
              <strong>Theme preference</strong> (<code>stem_mode</code>, with
              <code>app_mode</code> as a fallback auto-detected colour mode): whether you
              prefer dark or light mode, so the app remembers your choice.
            </li>
            <li>
              <strong>Sound preference</strong> (<code>stem_mute</code>): whether sound
              effects are muted.
            </li>
            <li>
              <strong>Admin panel session</strong> (<code>ghana_admin_token</code>,
              <code>ghana_admin_info</code>): only for admin accounts; the token expires
              after 2 hours.
            </li>
          </ul>
          <p>
            The login session is not stored in <code>localStorage</code>; it lives in the
            HttpOnly cookie described in section 3. None of this data is sent to third
            parties. It lives only on your device and on the app's own server (for
            registered users' quiz progress and leaderboard data).
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">6. Offline practice storage</h2>
          <p>
            The offline-practice feature can keep a pack of practice questions on your device
            so you can use it without a connection. It uses your browser's IndexedDB, under
            the database name <code>kwizbox-offline-practice</code>, with a
            <code>localStorage</code> copy at <code>kwizbox_offline_practice_pack</code> as a
            fallback for browsers where IndexedDB is unavailable. Question diagrams may be
            cached in your browser's Cache Storage under <code>kwizbox-offline-media</code>.
          </p>
          <p>
            This is question content only — no personal data is added to it — and it is never
            uploaded anywhere.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">7. Server-side data</h2>
          <p>
            Quiz results, streaks, and badges are stored on the app's server so your progress
            is saved and the leaderboard can work. This is not a cookie and is not shared
            externally. See the Privacy Policy for details on what is stored and how.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">8. Managing cookies and browser storage</h2>
          <p>
            You can clear the app's cookies and storage at any time through your browser's
            settings (usually under "Site settings" or "Storage"). Doing so will:
          </p>
          <ul className="policy-list">
            <li>log you out (the session cookie is removed);</li>
            <li>clear your last quiz result, badge cache, and offline practice pack from the
              browser (your server-side progress, if any, remains on the server);</li>
            <li>reset the theme and sound preferences to the defaults.</li>
          </ul>
          <p>
            The app's Settings page also has a “Clear Cache” button for its local data.
            Clearing browser storage does not affect other websites and is fully under your
            control.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">9. Why we use only one essential cookie</h2>
          <p>
            This app is a free, lightweight educational tool for learners, including
            children. We keep cookies to the single value needed to keep a session signed
            in, and we deliberately avoid analytics, advertising, and cross-site tracking.
            That keeps the app functional while minimising privacy risk and the data
            protection burden for a tool used by minors.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">10. Updates to this policy</h2>
          <p>
            This policy may be updated from time to time. The "last updated" date at the top
            reflects the most recent revision. Any change that introduces new cookies or
            tracking would be noted here.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">11. Contact</h2>
          <p>
            If you have questions about this Cookies and Tracking Policy, you can contact the
            operator here:
          </p>
          <ul className="policy-list">
            <li>Email: <strong>amoakobarnie@gmail.com</strong></li>
            <li>App: KwizBox — Ghana STEM Trivia</li>
          </ul>
        </section>
      </div>

      <div className="policy-nav">
        <button type="button" className="back" onClick={() => nav('/')}>← Back to app</button>
      </div>
    </div>
  )
}
