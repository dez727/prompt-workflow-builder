export default function SavedWorkflows({ workflows, onLoad, onDelete }) {
  const fmt = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div>
      <div className="saved-header">
        <div>
          <div className="home-eyebrow" style={{ marginBottom: 10 }}>
            <div className="home-eyebrow-line" />
            <span className="label-caps">Saved Workflows</span>
          </div>
          <h2 className="display-md" style={{ margin: 0 }}>Your workflow library</h2>
        </div>
        {workflows.length > 0 && (
          <span style={{ color: 'var(--ink-faint)', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            {workflows.length} saved
          </span>
        )}
      </div>

      {workflows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-num">0</div>
          <div className="empty-state-title">No saved workflows yet</div>
          <div className="empty-state-desc">
            Generate a workflow and click "Save Workflow" to store it here.
          </div>
        </div>
      ) : (
        <div className="saved-list">
          {workflows.map((w) => (
            <div key={w.id} className="saved-item">
              <div className="saved-item-body">
                <div className="saved-item-name">
                  {w.workflow?.workflowName ?? 'Untitled Workflow'}
                </div>
                <div className="saved-item-meta" style={{ marginTop: 6 }}>
                  {w.businessType && (
                    <span className="meta-pill pill-biz">
                      {w.businessType.icon} {w.businessType.name}
                    </span>
                  )}
                  {w.goal && (
                    <span className="meta-pill pill-biz">🎯 {w.goal.name}</span>
                  )}
                  {w.workflow?.difficulty && (
                    <span className="meta-pill pill-difficulty">{w.workflow.difficulty}</span>
                  )}
                  {w.createdAt && (
                    <span className="label-caps" style={{ marginLeft: 4 }}>
                      {fmt(w.createdAt)}
                    </span>
                  )}
                </div>
                {w.workflow?.summary && (
                  <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 8, marginBottom: 0, lineHeight: 1.6, maxWidth: 600 }}>
                    {w.workflow.summary.slice(0, 140)}{w.workflow.summary.length > 140 ? '…' : ''}
                  </p>
                )}
              </div>

              <div className="saved-item-actions">
                <button
                  className="btn btn-accent btn-sm"
                  onClick={() => onLoad(w)}
                >
                  Load
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => onDelete(w.id)}
                  title="Delete"
                  style={{ color: 'var(--ink-faint)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
