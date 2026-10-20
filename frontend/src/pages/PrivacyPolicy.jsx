import { useNavigate } from 'react-router-dom'

export default function PrivacyPolicy() {
  const nav = useNavigate()
  return (
    <div className="policy-page">
      <div className="policy-hero">
        <h1 className="policy-title">Privacy Policy</h1>
        <p className="policy-sub">KwizBox — last updated 19 October 2026</p>
      </div>

      <div className="policy-body">
        <section className="policy-section">
          <h2 className="policy-h2">1. Who we are</h2>
          <p>
            KwizBox is a free educational quiz app built for Ghanaian learners
            (Primary 4 through SHS 3). It is operated by an independent developer.
            We do not represent any government agency, school, or commercial entity,
            and we are not affiliated with or endorsed by NaCCA.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">2. The two ways to use the app</h2>
          <p>
            KwizBox has two modes, and they store different things. Reading this
            section is the fastest way to understand what happens to your data.
          </p>
          <ul className="policy-list">
            <li>
              <strong>Guest mode</strong> (Play as Guest): you do not create a password
              and you do not need to give a real name. However, starting a guest session
              <em>does</em> create a record on our server holding a nickname, class level,
              the age and sex you select, and your IP address. This is described in full
              in section 3.
            </li>
            <li>
              <strong>Registered mode</strong> (Sign up): you choose a nickname and a
              password. Your record additionally stores a hashed password. Age and sex
              are optional.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">3. What data we collect</h2>
          <p>We collect the following, and only the following:</p>
          <ul className="policy-list">
            <li>
              <strong>Nickname</strong> — whatever you type. It is displayed on the
              leaderboard if you play while signed in. We do not ask for, and cannot
              verify, your real name.
            </li>
            <li>
              <strong>Password hash</strong> (registered accounts only) — your password
              is run through bcrypt and only the hash is stored. We cannot read your
              password, and we will never ask for it outside the login form.
            </li>
            <li>
              <strong>Age</strong> — optional, a number between 5 and 99 chosen from a
              dropdown. It is not verified and is not used to identify you.
            </li>
            <li>
              <strong>Sex</strong> — optional, one of Male, Female, or Other. It is not
              verified and is not used for profiling.
            </li>
            <li>
              <strong>Class level</strong> — for example B7 or S2, so the app can serve
              the right questions.
            </li>
            <li>
              <strong>School code</strong> — optional, only if your school gave you one.
            </li>
            <li>
              <strong>IP address</strong> — recorded when an account or guest session is
              created, and again when you log in. This is standard server practice, used
              for basic abuse prevention and debugging. It is not used for advertising or
              profiling.
            </li>
            <li>
              <strong>Gameplay data</strong> — quiz results, scores, streaks, accuracy,
              and earned badges, so your progress and the leaderboard work.
            </li>
            <li>
              <strong>Session token</strong> — a signed JWT stored in your browser's
              <code>localStorage</code> that keeps you signed in. For regular users it
              expires after <strong>30 days</strong>; guest sessions use a guest-scoped
              token. Admin panel tokens expire after 2 hours. Clearing browser storage or
              logging out removes the token immediately.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">4. What we do NOT collect</h2>
          <ul className="policy-list">
            <li>No cookies of any kind are set by this application.</li>
            <li>No analytics, advertising, or tracking scripts (Google Analytics, Meta
              Pixel, Mixpanel, Hotjar, Segment, and similar) are loaded.</li>
            <li>No third-party service worker or tracking SDK is registered. The
              Progressive Web App / service worker feature is currently disabled.</li>
            <li>No device fingerprinting, no cross-site tracking, no location data, and no
              browsing history.</li>
            <li>No email address, phone number, or government identifier is requested or
              stored.</li>
            <li>We do not sell, rent, or share any personal data with third parties, and we
              use no external data processors.</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">5. How we use your data</h2>
          <p>
            Your data is used solely to operate the app: to authenticate you, to save and
            show your quiz progress, to compute leaderboard rankings, and to award badges.
            It is never used for marketing, advertising, profiling, or any purpose beyond
            running the app for you.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">6. Data storage and retention</h2>
          <p>
            Data is stored in a database on the server that hosts the app. Today that is a
            local SQLite database; the app is being moved to a hosted PostgreSQL database,
            and this section will be updated when that migration is complete. Either way
            the data stays with the app's own hosting and is not shared externally.
          </p>
          <p>
            Guest records are lightweight and can be removed by deleting the guest session
            (see section 8). There is no automatic expiry, so deleting a record is the
            reliable way to have it removed.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">7. Children's privacy</h2>
          <p>
            This app is designed for learners as young as Primary 4 (approximately 9 years
            old). We deliberately keep collection to a minimum: a self-chosen nickname, an
            optional age and sex, a class level, and an IP address. We do not seek to
            identify, contact, or profile minors, and we run no advertising or analytics.
          </p>
          <p>
            If you are a parent or guardian and have a question about your child's data,
            contact the app operator using the details in section 10.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">8. Your rights and how to exercise them</h2>
          <p>You can do all of the following at any time:</p>
          <ul className="policy-list">
            <li>
              <strong>See your data</strong> — your nickname, class, age, sex, scores, and
              quiz history are visible in the app under your profile.
            </li>
            <li>
              <strong>Delete your account and all associated data</strong> — available in
              the app's settings. Registered accounts must confirm their password; guest
              accounts can be deleted without one. Deletion removes your progress, badges,
              and quiz history along with the account itself.
            </li>
            <li>
              <strong>Withdraw consent</strong> — simply stop using the app, or log out to
              clear your in-browser token.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">9. Changes to this policy</h2>
          <p>
            We may update this policy from time to time. The "last updated" date at the top
            reflects the most recent revision. Material changes will be noted here; you do
            not need to take any action to continue using the app.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">10. Contact</h2>
          <p>
            Questions or concerns about this Privacy Policy or your data should be directed
            to the app operator via the app itself. This policy is governed by the laws of
            Ghana to the extent applicable to a free educational tool.
          </p>
        </section>
      </div>

      <div className="policy-nav">
        <button type="button" className="back" onClick={() => nav('/')}>← Back to app</button>
      </div>
    </div>
  )
}
