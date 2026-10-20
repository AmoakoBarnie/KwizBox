import { useNavigate } from 'react-router-dom'

export default function CookiePolicy() {
  const nav = useNavigate()
  return (
    <div className="policy-page">
      <div className="policy-hero">
        <h1 className="policy-title">Cookies and Tracking Policy</h1>
        <p className="policy-sub">KwizBox — last updated 19 October 2026</p>
      </div>

      <div className="policy-body">
        <section className="policy-section">
          <h2 className="policy-h2">1. Summary</h2>
          <p>
            <strong>This app sets no cookies.</strong> It does not use tracking cookies,
            analytics cookies, advertising cookies, or any other kind of cookie, and it does
            not embed third-party tracking scripts. It does use your browser's own storage
            for a few functional values, which are listed in section 4.
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
          <h2 className="policy-h2">3. Cookies we do NOT use</h2>
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
          <h2 className="policy-h2">4. Browser storage we do use (not cookies)</h2>
          <p>
            The app uses your browser's <code>localStorage</code> — a separate browser
            storage mechanism that is never sent to any server automatically — for purely
            functional purposes. This is <strong>not</strong> a cookie. The following values
            are stored locally on your device:
          </p>
          <ul className="policy-list">
            <li>
              <strong>Login session token</strong> (<code>kwizbox_token</code>): a JWT that
              keeps you signed in. It expires after 30 days for registered users, and is
              cleared when you log out or clear browser storage.
            </li>
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
              <strong>Theme preference</strong> (<code>stem_mode</code>): whether you prefer
              dark or light mode, so the app remembers your choice.
            </li>
            <li>
              <strong>Sound preference</strong> (<code>stem_mute</code>): whether sound
              effects are muted.
            </li>
            <li>
              <strong>Admin session token</strong> (<code>ghana_admin_token</code>) and
              <strong>admin panel info</strong> (<code>ghana_admin_info</code>): used only by
              the administrator panel. Admin tokens expire after 2 hours.
            </li>
          </ul>
          <p>
            None of this data is sent to third parties. It lives only on your device and on
            the app's own server (for registered users' quiz progress and leaderboard data).
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">5. Offline practice storage</h2>
          <p>
            The offline-practice feature can keep a pack of practice questions on your device
            so you can use it without a connection. It uses your browser's IndexedDB, under
            the database name <code>kwizbox-offline-practice</code>, with a
            <code>localStorage</code> copy at <code>kwizbox_offline_practice_pack</code> as a
            fallback for browsers where IndexedDB is unavailable.
          </p>
          <p>
            This is question content only — no personal data is added to it — and it is never
            uploaded anywhere.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">6. Server-side data</h2>
          <p>
            Quiz results, streaks, and badges are stored on the app's server so your progress
            is saved and the leaderboard can work. This is not a cookie and is not shared
            externally. See the Privacy Policy for details on what is stored and how.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">7. Managing browser storage</h2>
          <p>
            You can clear the app's storage at any time through your browser's settings
            (usually under "Site settings" or "Storage"). Doing so will:
          </p>
          <ul className="policy-list">
            <li>log you out (the session token is removed);</li>
            <li>clear your last quiz result, badge cache, and offline practice pack from the
              browser (your server-side progress, if any, remains on the server);</li>
            <li>reset the theme and sound preferences to the defaults.</li>
          </ul>
          <p>
            Clearing browser storage does not affect other websites and is fully under your
            control.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">8. Why we do not use cookies</h2>
          <p>
            This app is a free, lightweight educational tool for learners, including
            children. We chose not to use cookies or tracking because they are unnecessary for
            the app to function, they add privacy risk, and they would complicate compliance
            with data protection requirements for a tool used by minors.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">9. Updates to this policy</h2>
          <p>
            This policy may be updated from time to time. The "last updated" date at the top
            reflects the most recent revision. Any change that introduces cookies or tracking
            would be noted here.
          </p>
        </section>
      </div>

      <div className="policy-nav">
        <button type="button" className="back" onClick={() => nav('/')}>← Back to app</button>
      </div>
    </div>
  )
}
