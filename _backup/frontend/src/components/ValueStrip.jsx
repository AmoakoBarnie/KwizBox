const STATS = [
  { n: '499+', label: 'NaCCA-aligned questions' },
  { n: 'B4–B9', label: 'Primary to JHS 3' },
  { n: 'Low-data', label: 'Works on 2G connections' },
]

export default function ValueStrip() {
  return (
    <section className="value-strip" aria-label="Proof">
      <ul className="stats-grid">
        {STATS.map((s) => (
          <li key={s.label}>
            <b>{s.n}</b>
            <span>{s.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}