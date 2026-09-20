import { Link } from 'react-router-dom'

export default function TermsAndConditions() {
  return (
    <div className="policy-page">
      <div className="policy-hero">
        <h1 className="policy-title">Terms and Conditions</h1>
        <p className="policy-sub">KwizBox — last updated 12 September 2026</p>
      </div>

      <div className="policy-body">
        <section className="policy-section">
          <h2 className="policy-h2">1. Acceptance of terms</h2>
          <p>
            By accessing or using KwizBox (the "App"), you agree to be bound by
            these Terms and Conditions. If you do not accept them, do not use the App.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">2. Description of the service</h2>
          <p>
            KwizBox is a free, curriculum-aligned educational quiz application
            covering Science, Technology, Engineering, and Mathematics (STEM) topics for
            Ghanaian learners from Primary 4 (B4) to JHS 3 (B9). The content is aligned to
            the NaCCA curriculum where applicable.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">3. Eligibility</h2>
          <p>
            The App is intended for learners, teachers, and anyone interested in Ghanaian STEM
            education. There is no minimum age to use the App in guest mode. Registration is
            optional and open to any user who accepts these terms.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">4. User accounts</h2>
          <p>
            When you register, you choose a nickname. You are responsible for keeping your
            password confidential. You agree not to:
          </p>
          <ul className="policy-list">
            <li>create more than one account for the purpose of manipulating the leaderboard;</li>
            <li>use an offensive, deceptive, or impersonating nickname;</li>
            <li>share your account credentials with others.</li>
          </ul>
          <p>
            The operator reserves the right to remove any account or leaderboard entry that
            violates these terms, at its discretion.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">5. Guest usage</h2>
          <p>
            You may use the App without creating an account. In guest mode, quiz results are
            graded in your browser and are not saved to the server. Leaderboard participation
            requires a registered account.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">6. Academic integrity</h2>
          <p>
            The App is designed as a learning and practice tool. Users are encouraged to use it
            to learn and revise. Any use of the App to gain an unfair advantage in a formal
            school assessment is outside the intended use and is the user's responsibility.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">7. Content and copyright</h2>
          <p>
            The quiz questions, explanations, and app design are the responsibility of the app
            operator. They are provided for educational use. You may not reproduce the full
            question bank, rebrand the App, or resell it without permission.
          </p>
          <p>
            NaCCA curriculum references are used for alignment purposes only. This App is not
            affiliated with, endorsed by, or sponsored by NaCCA or the Government of Ghana.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">8. Disclaimer of warranties</h2>
          <p>
            The App is provided "as is" and "as available" for educational purposes, without
            warranty of any kind, express or implied, including accuracy, completeness,
            fitness for a particular purpose, or non-infringement. Quiz content is prepared to
            the best of the operator's ability but is not a substitute for formal curriculum
            materials or teacher instruction.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">9. Limitation of liability</h2>
          <p>
            To the fullest extent permitted by law, the operator shall not be liable for any
            indirect, incidental, special, or consequential loss or damage arising from your use
            of the App, including loss of scores, progress, or data, even if advised of the
            possibility of such loss.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">10. Termination</h2>
          <p>
            Your right to use the App may be terminated by you at any time (simply stop using it)
            or by the operator at any time, with or without notice, for violation of these terms
            or for operational reasons.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">11. Changes to these terms</h2>
          <p>
            These terms may be updated from time to time. The "last updated" date at the top
            shows the most recent revision. Continued use of the App after a change constitutes
            acceptance of the updated terms.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-h2">12. Governing law</h2>
          <p>
            These terms are governed by the laws of Ghana. Any dispute arising from them shall
            be resolved in the courts of Ghana to the extent that a court has jurisdiction.
          </p>
        </section>
      </div>

      <div className="policy-nav">
        <Link to="/terms-and-conditions" className="policy-back">← Back to app</Link>
      </div>
    </div>
  )
}
