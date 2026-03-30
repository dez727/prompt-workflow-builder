const STEPS = [
  { num: 1, label: 'Business Type' },
  { num: 2, label: 'Goal' },
  { num: 3, label: 'Workflow' },
]

export default function StepIndicator({ currentStep }) {
  return (
    <div className="step-indicator">
      {STEPS.map((s, i) => {
        const isDone   = s.num < currentStep
        const isActive = s.num === currentStep
        return (
          <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div className="step-item">
              <div className={`step-num ${isActive ? 'active' : isDone ? 'done' : ''}`}>
                {isDone ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : s.num}
              </div>
              <span className={`step-label ${isActive ? 'active' : isDone ? 'done' : ''}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`step-connector ${isDone ? 'done' : ''}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
