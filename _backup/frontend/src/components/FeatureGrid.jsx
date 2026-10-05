const FEATURES = [
  { icon: '📡', title: 'Offline play', body: 'Download packs on Wi‑Fi, quiz anywhere without burning data.' },
  { icon: '🏆', title: 'Leaderboards', body: 'Class and national ranks update after every quiz session.' },
  { icon: '🎖️', title: 'Badges', body: 'Streaks and mastery badges keep you coming back daily.' },
  { icon: '⚡', title: 'Adaptive', body: 'Question difficulty adjusts to your level so you always stretch.' },
]

export default function FeatureGrid() {
  return (
    <section id="subjects" className="feature-grid" aria-label="Features">
      <h2>Built for Ghanaian learners</h2>
      <div className="features-grid">
        {FEATURES.map((f) => (
          <article key={f.title} className="feature-card">
            <span aria-hidden="true" className="feature-icon">{f.icon}</span>
            <b>{f.title}</b>
            <p>{f.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}