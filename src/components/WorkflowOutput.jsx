import { useState, useEffect } from 'react'
import { exportWorkflowJSON, buildClipboardText } from '../lib/storage.js'

/* ─── Loading ────────────────────────────────────────────────────────────────── */
const LOADING_MESSAGES = [
  'Analysing your business context…',
  'Designing workflow architecture…',
  'Selecting optimal tools…',
  'Crafting starter prompts…',
  'Finalising implementation steps…',
]

function LoadingState() {
  const [msgIdx, setMsgIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 2200)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="loading-container">
      <div className="loading-orb" />
      <div className="loading-status">{LOADING_MESSAGES[msgIdx]}</div>
      <div className="loading-sub">This usually takes 10–20 seconds</div>
    </div>
  )
}

/* ─── Error ──────────────────────────────────────────────────────────────────── */
function ErrorState({ error, onRetry, onReset }) {
  return (
    <div className="error-container">
      <div className="error-code">!</div>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
        Generation Failed
      </div>
      <div className="error-msg">{error}</div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-accent" onClick={onRetry}>Try Again</button>
        <button className="btn btn-ghost" onClick={onReset}>Start Over</button>
      </div>
    </div>
  )
}

/* ─── Step type badge ────────────────────────────────────────────────────────── */
function TypeBadge({ type }) {
  const t = (type ?? 'action').toLowerCase()
  return <span className={`workflow-step-type type-${t}`}>{t}</span>
}

/* ─── Workflow tab ───────────────────────────────────────────────────────────── */
function WorkflowTab({ workflow }) {
  return (
    <div>
      <p style={{ color: 'var(--ink-muted)', lineHeight: 1.7, marginBottom: 32, maxWidth: 680 }}>
        {workflow.summary}
      </p>
      <div className="workflow-diagram">
        {(workflow.workflow ?? []).map((step, i) => (
          <div key={step.id} className="workflow-step-wrap">
            <div className="workflow-step-node">
              <TypeBadge type={step.type} />
              <div className="workflow-step-name">{step.step}</div>
              <div className="workflow-step-desc">{step.description}</div>
              <div className="workflow-step-tool">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4, verticalAlign: 'middle' }}>
                  <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                </svg>
                {step.tool}
              </div>
            </div>
            {i < (workflow.workflow?.length ?? 0) - 1 && (
              <div className="workflow-arrow">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Tools tab ──────────────────────────────────────────────────────────────── */
function ToolsTab({ tools }) {
  const catClass = (cat) => {
    const map = { automation: 'cat-automation', ai: 'cat-ai', crm: 'cat-crm', communication: 'cat-communication', analytics: 'cat-analytics' }
    return map[cat] ?? 'cat-other'
  }
  return (
    <div className="tools-grid">
      {(tools ?? []).map((tool, i) => (
        <div key={i} className={`tool-card ${tool.priority === 'essential' ? 'essential' : ''}`}>
          {tool.priority === 'essential' && <span className="tool-essential-badge">Essential</span>}
          <div className="tool-header">
            <span className={`tool-category-dot ${catClass(tool.category)}`} />
            <div>
              <div className="tool-name">{tool.name}</div>
              <div className="tool-category-label">{tool.category}</div>
            </div>
          </div>
          <div className="tool-reason">{tool.reason}</div>
          <span className="tool-cost">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            {tool.cost}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ─── Prompts tab ────────────────────────────────────────────────────────────── */
function PromptsTab({ prompts }) {
  const [copied, setCopied] = useState(null)

  const copy = (text, idx) => {
    navigator.clipboard.writeText(text)
    setCopied(idx)
    setTimeout(() => setCopied(null), 1800)
  }

  // Highlight [VARIABLES] in prompts
  const renderPromptText = (text) => {
    const parts = text.split(/(\[[A-Z_]+\])/g)
    return parts.map((part, i) =>
      /^\[[A-Z_]+\]$/.test(part) ? <span key={i} className="prompt-var">{part}</span> : part
    )
  }

  return (
    <div className="prompt-list">
      {(prompts ?? []).map((p, i) => (
        <div key={i} className="prompt-card">
          <div className="prompt-card-header">
            <div>
              <div className="prompt-title">{p.title}</div>
              <div className="prompt-use-case">{p.useCase}</div>
            </div>
            <button
              className={`btn btn-ghost btn-sm ${copied === i ? 'copy-flash' : ''}`}
              onClick={() => copy(p.prompt, i)}
            >
              {copied === i ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="prompt-body">{renderPromptText(p.prompt)}</div>
        </div>
      ))}
    </div>
  )
}

/* ─── Setup tab ──────────────────────────────────────────────────────────────── */
function SetupTab({ steps, tips }) {
  return (
    <div>
      <div className="setup-list">
        {(steps ?? []).map((s, i) => (
          <div key={i} className="setup-step" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="setup-step-num">{String(s.step).padStart(2, '0')}</div>
            <div className="setup-step-body">
              <div className="setup-step-action">{s.action}</div>
              <div className="setup-step-detail">{s.detail}</div>
              {s.timeEstimate && <span className="setup-step-time">{s.timeEstimate}</span>}
            </div>
          </div>
        ))}
      </div>

      {tips?.length > 0 && (
        <div className="pro-tips-section">
          <div className="pro-tips-title">Pro Tips</div>
          {tips.map((tip, i) => (
            <div key={i} className="pro-tip-item">
              <div className="pro-tip-dot" />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Main Output Component ──────────────────────────────────────────────────── */
const TABS = [
  { id: 'workflow', label: 'Workflow',    key: 'workflow' },
  { id: 'tools',    label: 'Tools',       key: 'recommendedTools' },
  { id: 'prompts',  label: 'Prompts',     key: 'starterPrompts' },
  { id: 'setup',    label: 'Setup Guide', key: 'implementationSteps' },
]

export default function WorkflowOutput({
  isGenerating,
  error,
  workflow,
  businessType,
  goal,
  onSave,
  onReset,
  onRetry,
}) {
  const [activeTab, setActiveTab] = useState('workflow')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleCopyAll = () => {
    if (!workflow) return
    navigator.clipboard.writeText(buildClipboardText(workflow))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = () => {
    onSave()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (isGenerating) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={onRetry} onReset={onReset} />
  if (!workflow) return null

  const tabCount = (key) => workflow[key]?.length ?? 0

  return (
    <div className="output-container">
      {/* Header */}
      <div className="output-header">
        <div className="home-eyebrow">
          <div className="home-eyebrow-line" />
          <span className="label-caps">Step 03 — Generated</span>
        </div>
        <h2 className="display-md" style={{ margin: '8px 0 0' }}>
          {workflow.workflowName}
        </h2>
        <div className="output-meta">
          <span className="meta-pill pill-biz">{businessType?.icon} {businessType?.name}</span>
          <span className="meta-pill pill-biz">🎯 {goal?.name}</span>
          {workflow.difficulty && (
            <span className="meta-pill pill-difficulty">{workflow.difficulty}</span>
          )}
          {workflow.estimatedSetupTime && (
            <span className="meta-pill pill-time">⏱ {workflow.estimatedSetupTime} setup</span>
          )}
        </div>
        <p style={{ color: 'var(--ink-muted)', lineHeight: 1.6, marginTop: 16, maxWidth: 760 }}>
          Review the generated workflow, prompts, and tool suggestions before using them with real clients, internal systems, or sensitive data.
        </p>
      </div>

      {/* Tabs */}
      <div className="output-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`output-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            <span className="tab-count">{tabCount(tab.key)}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="tab-panel" key={activeTab}>
        {activeTab === 'workflow' && <WorkflowTab workflow={workflow} />}
        {activeTab === 'tools'    && <ToolsTab tools={workflow.recommendedTools} />}
        {activeTab === 'prompts'  && <PromptsTab prompts={workflow.starterPrompts} />}
        {activeTab === 'setup'    && <SetupTab steps={workflow.implementationSteps} tips={workflow.proTips} />}
      </div>

      {/* Actions */}
      <div className="output-actions">
        <button className="btn btn-accent" onClick={handleSave}>
          {saved ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              Saved!
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
              </svg>
              Save Workflow
            </>
          )}
        </button>

        <button className="btn btn-ghost" onClick={handleCopyAll}>
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copy All
            </>
          )}
        </button>

        <button
          className="btn btn-ghost"
          onClick={() => exportWorkflowJSON(workflow, businessType, goal)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export JSON
        </button>

        <button className="btn btn-ghost" onClick={onReset} style={{ marginLeft: 'auto' }}>
          Start Over
        </button>
      </div>
    </div>
  )
}
