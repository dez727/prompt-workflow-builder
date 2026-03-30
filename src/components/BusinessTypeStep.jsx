import { BUSINESS_TYPES } from '../lib/businessData.js'

export default function BusinessTypeStep({ selected, onSelect, onNext }) {
  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <div className="home-eyebrow">
          <div className="home-eyebrow-line" />
          <span className="label-caps">Step 01</span>
        </div>
        <h2 className="display-md" style={{ marginBottom: 8, marginTop: 0 }}>
          What type of business are you building for?
        </h2>
        <p style={{ color: 'var(--ink-muted)', fontSize: 15, margin: 0 }}>
          Select the category that best fits your client or your own business.
        </p>
      </div>

      <div className="selector-grid">
        {BUSINESS_TYPES.map((bt) => (
          <button
            key={bt.id}
            className={`selector-card ${selected?.id === bt.id ? 'selected' : ''}`}
            onClick={() => onSelect(bt)}
          >
            <span className="selector-card-icon">{bt.icon}</span>
            <div className="selector-card-name">{bt.name}</div>
            <div className="selector-card-desc">{bt.desc}</div>
          </button>
        ))}
      </div>

      <div className="step-nav">
        <span style={{ color: 'var(--ink-faint)', fontSize: 13 }}>
          {selected ? `Selected: ${selected.name}` : 'No selection yet'}
        </span>
        <button className="btn btn-accent" onClick={onNext} disabled={!selected}>
          Continue
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  )
}
