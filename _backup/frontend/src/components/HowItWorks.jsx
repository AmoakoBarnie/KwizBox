const STEPS = [
  { n: '1', title: 'Pick your class', desc: 'Choose B4 through B9 and your subjects — Science, Maths, Computing.' },
  { n: '2', title: 'Answer questions', desc: 'Timed packs with explanations after every question.' },
  { n: '3', title: 'Track progress', desc: 'Leaderboards, badges, and mastery stats show your growth.' },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="how-it" aria-label="How it works">
      <h2>Three steps, real results</h2>
      <div className="steps-grid">
        {STEPS.map((s) => (
          <div key={s.n} className="step">
            <span className="step-num" aria-hidden="true">{s.n}</span>
            <b>{s.title}</b>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}