import { Link } from 'react-router-dom'

export default function CookiePolicy() {
  return (
    <div className="policy-page">
      <div className="policy-hero">
        <h1 className="policy-title">Cookies and Tracking Policy</h1>
        <p className="policy-sub">KwizBox — last updated 12 September 2026</p>
      </div>

      <div className="policy-body">
        <section className="policy-section">
          <h2 className="policy-h2">1. Summary</h2>
          <p>
            <strong>This app sets no cookies.</strong> It does not use tracking cookies,
            analytics cookies, advertising cookies, or any other kind of cookie. It does not
            embed third-party tracking scripts.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">2. What a cookie is</h2>
          <p>
            A cookie is a small piece of data that a website stores in your browser. Websites
            use cookies for many things: remembering you are logged in, counting visitors,
            showing relevant ads, and tracking your behaviour across sites.
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
              <strong>No third-party cookies</strong> — no external service is given access to
              set cookies in your browser through this app.
            </li>
            <li>
              <strong>No tracking or fingerprinting</strong> — we do not use device
              fingerprinting, cross-site tracking, or any technique that identifies you across
              websites.
            </li>
            <li>
              <strong>No service worker or PWA tracking</strong> — the app's Progressive Web
              App (PWA) / service worker feature is disabled and no tracking service worker is
              registered.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">4. Browser storage we do use (not cookies)</h2>
          <p>
            The app uses your browser's <code>localStorage</code> — a separate browser storage
            mechanism — for purely functional purposes. This is <strong>not</strong> a cookie
            and is not shared with anyone. The following are stored locally on your device:
          </p>
          <ul className="policy-list">
            <li>
              <strong>Login session token</strong> (<code>kwizbox_token</code>): a short-lived
              JWT that keeps you signed in during a visit. It is cleared when you log out and
              expires on its own.
            </li>
            <li>
              <strong>Last quiz result and configuration</strong> (<code>stem_last_result</code>,
              <code>stem_last_cfg</code>): your most recent quiz outcome and the settings used,
              stored so you can see it if you refresh the page. It is your own result data.
            </li>
            <li>
              <strong>Earned badges</strong> (<code>stem_badges</code>): a list of badges you
              have earned, stored so they persist across sessions.
            </li>
            <li>
              <strong>App theme preference</strong> (<code>app_mode</code>): whether you prefer
              dark or light mode, stored so the app remembers your choice.
            </li>
            <li>
              <strong>Admin session token</strong> (<code>kwizbox_admin_token</code>): a separate
              token used only by the administrator panel, with the same behaviour as the user
              token above.
            </li>
          </ul>
          <p>
            None of this data is sent to third parties. It lives only on your device and on the
            app's own server (for registered users' quiz progress and leaderboard data).
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">5. Server-side data</h2>
          <p>
            For registered users, quiz results, streaks, and badges are stored on the app's
            server so your progress is saved and the leaderboard can work. This is not a cookie
            and is not shared externally. See the Privacy Policy for details on what is stored
            and how.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">6. Managing browser storage</h2>
          <p>
            You can clear the app's localStorage at any time through your browser's settings
            (usually under "Site settings" or "Storage"). Doing so will:
          </p>
          <ul className="policy-list">
            <li>log you out (the session token is removed);</li>
            <li>clear your last quiz result and badge cache from the browser (your server-side
              progress, if any, remains on the server);</li>
            <li>reset the theme preference to the default.</li>
          </ul>
          <p>
            Clearing browser storage does not affect other websites and is fully under your
            control.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">7. Why we do not use cookies</h2>
          <p>
            This app is a free, lightweight educational tool for learners, including children.
            We chose not to use cookies or tracking because they are unnecessary for the app to
            function, they add privacy risk, and they would complicate compliance with data
            protection requirements for a tool used by minors.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">8. Updates to this policy</h2>
          <p>
            This policy may be updated from time to time. The "last updated" date at the top
            reflects the most recent revision. Any change that introduces cookies or tracking
            would be noted here.
          </p>
        </section>
      </div>

      <div className="policy-nav">
        <Link to="/cookie-policy" className="policy-back">← Back to app</Link>
      </div>
    </div>
  )
}
