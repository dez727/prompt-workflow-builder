import { useState } from 'react'
import { GOALS } from '../lib/businessData.js'

export default function GoalStep({ businessType, selected, onSelect, onNext, onBack }) {
  const goals = GOALS[businessType?.id] ?? []
  const [customGoal, setCustomGoal] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const handleCustomSubmit = () => {
    if (!customGoal.trim()) return
    onSelect({ id: 'custom', name: customGoal.trim(), desc: 'Custom goal', icon: '✏️' })
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <div className="home-eyebrow">
          <div className="home-eyebrow-line" />
          <span className="label-caps">Step 02</span>
        </div>
        <h2 className="display-md" style={{ marginBottom: 8, marginTop: 0 }}>
          What's your primary goal?
        </h2>
        <p style={{ color: 'var(--ink-muted)', fontSize: 15, margin: 0 }}>
          Choose the outcome you want to automate for your{' '}
          <strong style={{ color: 'var(--ink)' }}>{businessType?.name}</strong> business.
        </p>
      </div>

      <div className="goal-list">
        {goals.map((g) => (
          <button
            key={g.id}
            className={`goal-card ${selected?.id === g.id ? 'selected' : ''}`}
            onClick={() => onSelect(g)}
          >
            <span className="goal-card-icon">{g.icon}</span>
            <div className="goal-card-content">
              <div className="goal-card-name">{g.name}</div>
              <div className="goal-card-desc">{g.desc}</div>
            </div>
            <div className="goal-card-check">
              {selected?.id === g.id && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          </button>
        ))}

        {/* Custom goal */}
        {!showCustom ? (
          <button
            className="goal-card"
            onClick={() => setShowCustom(true)}
            style={{ borderStyle: 'dashed' }}
          >
            <span className="goal-card-icon">✏️</span>
            <div className="goal-card-content">
              <div className="goal-card-name">Custom Goal</div>
              <div className="goal-card-desc">Describe a specific goal not listed above</div>
            </div>
            <div className="goal-card-check" />
          </button>
        ) : (
          <div
            style={{
              padding: '18px 20px',
              background: 'var(--paper-raised)',
              border: '1.5px solid var(--accent)',
              borderRadius: 4,
            }}
          >
            <div className="label-caps" style={{ marginBottom: 8 }}>Describe your custom goal</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Automate appointment scheduling and follow-up"
                value={customGoal}
                onChange={(e) => setCustomGoal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                autoFocus
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              />
              <button className="btn btn-accent btn-sm" onClick={handleCustomSubmit}>
                Use
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowCustom(false); setCustomGoal('') }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="step-nav">
        <button className="btn btn-ghost" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </button>
        <button className="btn btn-accent" onClick={onNext} disabled={!selected}>
          Generate Workflow
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </button>
      </div>
    </div>
  )
}
