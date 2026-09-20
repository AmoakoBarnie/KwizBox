import { Link } from 'react-router-dom'

export default function PrivacyPolicy() {
  return (
    <div className="policy-page">
      <div className="policy-hero">
        <h1 className="policy-title">Privacy Policy</h1>
        <p className="policy-sub">KwizBox — last updated 12 September 2026</p>
      </div>

      <div className="policy-body">
        <section className="policy-section">
          <h2 className="policy-h2">1. Who we are</h2>
          <p>
            KwizBox is a free educational web app built for Ghanaian learners
            (Primary 4 through JHS 3). It is operated by an independent developer.
            We do not represent any government agency, school, or commercial entity.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">2. What data we collect</h2>
          <p>We collect the following, and only the following:</p>
          <ul className="policy-list">
            <li>
              <strong>Account data (registered users only):</strong> your chosen nickname
              and a password hash. We never store your real name, email address, phone number,
              location, school, or any government identifier.
            </li>
            <li>
              <strong>Gameplay data:</strong> quiz results, scores, streaks, and earned
              badges — stored so you can see your progress and appear on the leaderboard
              if you choose to play logged in.
            </li>
            <li>
              <strong>Session token:</strong> a short-lived JWT held in your browser's
              <code>localStorage</code> so the app remembers you during a visit. It expires
              and is cleared on logout.
            </li>
          </ul>
          <p>
            <strong>Guest users</strong> who play without logging in generate no account data
            at all. Their quiz results are graded in the browser and not stored on our servers.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">3. What we do NOT collect</h2>
          <ul className="policy-list">
            <li>No cookies of any kind are set by this application.</li>
            <li>No analytics, advertising, or tracking scripts (Google Analytics, Meta Pixel,
              Mixpanel, Hotjar, etc.) are loaded.</li>
            <li>No third-party service worker or tracking SDK is registered.</li>
            <li>We do not collect IP addresses, device fingerprints, location, or browsing
              history for profiling or advertising purposes.</li>
            <li>We do not sell, rent, or share any personal data with third parties.</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">4. How we use your data</h2>
          <p>
            Your data is used solely to operate the app: to authenticate you, to save and
            show your quiz progress, to compute leaderboard rankings, and to award badges.
            It is never used for marketing, advertising, profiling, or any purpose beyond
            running the app for you.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">5. Data storage and retention</h2>
          <p>
            All data is stored in a local SQLite database on the server that hosts the app.
            There is no cloud analytics pipeline, no data warehouse, and no data shared with
            external processors. When you delete your account (via the admin panel if you are
            an administrator, or by contacting the app operator), your personal data is removed
            from that database.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">6. Children's privacy</h2>
          <p>
            This app is designed for learners as young as Primary 4 (approximately 9 years old).
            We deliberately avoid collecting any personal data from children beyond a self-chosen
            nickname for registered users. We do not seek to identify, contact, or profile minors.
            If you are a parent or guardian and have a question about your child's data, treat
            this policy as covering that data and contact the app operator.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">7. Your rights</h2>
          <p>
            You may, at any time: view the data associated with your account (your nickname,
            badges, and quiz history appear in the app), ask that it be removed, or withdraw
            consent by not using the app. Registered users can reset their session by logging
            out, which clears the in-browser token.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">8. Changes to this policy</h2>
          <p>
            We may update this policy from time to time. The "last updated" date at the top
            reflects the most recent revision. Material changes will be noted here; you do not
            need to take any action to continue using the app.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">9. Contact</h2>
          <p>
            Questions or concerns about this Privacy Policy or your data should be directed to
            the app operator via the app itself. This policy is governed by the laws of Ghana
            to the extent applicable to a free educational tool.
          </p>
        </section>
      </div>

      <div className="policy-nav">
        <Link to="/privacy-policy" className="policy-back">← Back to app</Link>
      </div>
    </div>
  )
}
