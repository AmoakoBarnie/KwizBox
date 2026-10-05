import { useState } from 'react'

const PLANS = [
  { name: 'Free', monthly: 0, annual: 0, desc: 'Guest access, limited packs', cta: 'Start playing', highlighted: false },
  { name: 'Premium', monthly: 29, annual: 240, desc: 'Full bank + leaderboards', cta: 'Start playing', highlighted: true, billed: 'GHS 20 / mo' },
  { name: 'School', monthly: 99, annual: 799, desc: 'Admin dashboard + class codes', cta: 'Start playing', highlighted: false },
]

export default function Pricing({ onCta }) {
  const [annual, setAnnual] = useState(true)

  return (
    <section id="pricing" className="pricing" aria-label="Pricing">
      <h2>Simple pricing</h2>
      <div className="toggle-row">
        <span>Monthly</span>
        <button className={`toggle${annual ? ' toggle-on' : ''}`} onClick={() => setAnnual((a) => !a)} aria-label="Toggle annual billing">
          <span className="toggle-knob" />
        </button>
        <span>Annual <small>save 20%</small></span>
      </div>
      <div className="plans-grid">
        {PLANS.map((p) => (
          <div key={p.name} className={`plan-card${p.highlighted ? ' plan-highlighted' : ''}`}>
            <b className="plan-name">{p.name}</b>
            <p className="plan-price">
              {p.monthly === 0 ? 'Free' : `${annual ? p.annual : p.monthly} GHS`}
              {p.monthly > 0 && <small>{annual ? '/yr' : '/mo'}</small>}
            </p>
            {annual && p.billed && <p className="plan-billed">Billed as {p.billed}</p>}
            <p className="plan-desc">{p.desc}</p>
            <button className="btn primary" onClick={() => onCta?.()}>{p.cta}</button>
          </div>
        ))}
      </div>
    </section>
  )
}