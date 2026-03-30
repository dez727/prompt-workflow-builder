import { useState } from 'react'
import Header from './components/Header.jsx'
import StepIndicator from './components/StepIndicator.jsx'
import BusinessTypeStep from './components/BusinessTypeStep.jsx'
import GoalStep from './components/GoalStep.jsx'
import WorkflowOutput from './components/WorkflowOutput.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import SavedWorkflows from './components/SavedWorkflows.jsx'
import { loadSettings, saveSettings, loadWorkflows, saveWorkflow, deleteWorkflow } from './lib/storage.js'
import { generateWorkflow } from './lib/aiProviders.js'

/* ─── Home Page ──────────────────────────────────────────────────────────────── */
function HomePage({ onStart, onSaved, savedCount }) {
  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-eyebrow">
          <div className="home-eyebrow-line" />
          <span className="label-caps">AI Workflow Builder</span>
        </div>

        <h1 className="display-xl home-title">
          Turn business goals into <em>actionable</em> AI workflows
        </h1>

        <p className="home-subtitle">
          Pick your business type, choose a goal, and get a complete workflow — recommended tools,
          starter prompts, and step-by-step implementation guide — in seconds.
        </p>

        <div className="home-ctas">
          <button className="btn btn-accent" onClick={onStart} style={{ fontSize: 15, padding: '13px 28px' }}>
            Build a Workflow
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </button>

          {savedCount > 0 && (
            <button className="btn btn-ghost" onClick={onSaved}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
              </svg>
              View {savedCount} saved workflow{savedCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      <div className="home-features">
        {[
          { num: '01', title: 'Choose Your Context', desc: 'Select your business type and the goal you want to automate.' },
          { num: '02', title: 'AI Generates the Plan', desc: 'Get a complete workflow with tools, prompts, and implementation steps.' },
          { num: '03', title: 'Save & Implement', desc: 'Save workflows per client, copy prompts, and export to JSON.' },
          { num: '04', title: 'Your AI, Your Way', desc: 'Use Claude API or any local Ollama model — no lock-in.' },
        ].map((f) => (
          <div key={f.num}>
            <div className="home-feature-num">{f.num}</div>
            <div className="home-feature-title">{f.title}</div>
            <div className="home-feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Config Warning ─────────────────────────────────────────────────────────── */
function ConfigWarning({ onOpenSettings }) {
  return (
    <div className="config-prompt">
      <div className="config-prompt-text">
        <strong>No AI provider configured</strong>
        Connect Claude API or a local Ollama model to generate workflows.
      </div>
      <button className="btn btn-ghost btn-sm" onClick={onOpenSettings}>
        Open Settings
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>
    </div>
  )
}

/* ─── App ─────────────────────────────────────────────────────────────────────── */
export default function App() {
  const [view, setView]                     = useState('home')    // 'home' | 'builder' | 'saved'
  const [step, setStep]                     = useState(1)
  const [selectedBusinessType, setSelectedBT] = useState(null)
  const [selectedGoal, setSelectedGoal]     = useState(null)
  const [workflow, setWorkflow]             = useState(null)
  const [isGenerating, setIsGenerating]     = useState(false)
  const [genError, setGenError]             = useState(null)
  const [showSettings, setShowSettings]     = useState(false)
  const [settings, setSettings]             = useState(loadSettings)
  const [savedWorkflows, setSavedWorkflows] = useState(loadWorkflows)

  /* handlers */
  const handleSettingsSave = (s) => {
    saveSettings(s)
    setSettings(s)
    setShowSettings(false)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setGenError(null)
    setWorkflow(null)
    setStep(3)
    try {
      const result = await generateWorkflow(selectedBusinessType, selectedGoal, settings)
      setWorkflow(result)
    } catch (err) {
      setGenError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveWorkflow = () => {
    if (!workflow) return
    saveWorkflow({ businessType: selectedBusinessType, goal: selectedGoal, workflow, createdAt: new Date().toISOString() })
    setSavedWorkflows(loadWorkflows())
  }

  const handleDeleteWorkflow = (id) => {
    deleteWorkflow(id)
    setSavedWorkflows(loadWorkflows())
  }

  const handleLoadWorkflow = (saved) => {
    setSelectedBT(saved.businessType)
    setSelectedGoal(saved.goal)
    setWorkflow(saved.workflow)
    setGenError(null)
    setStep(3)
    setView('builder')
  }

  const handleReset = () => {
    setStep(1)
    setSelectedBT(null)
    setSelectedGoal(null)
    setWorkflow(null)
    setGenError(null)
    setView('builder')
  }

  const isConfigured = settings.provider === 'claude'
    ? !!settings.claudeApiKey
    : settings.provider === 'ollama'
      ? !!settings.ollamaModel
      : false

  return (
    <div className="app-shell">
      <Header
        onSettings={() => setShowSettings(true)}
        onSaved={() => setView((v) => (v === 'saved' ? 'builder' : 'saved'))}
        onHome={() => setView('home')}
        savedCount={savedWorkflows.length}
        view={view}
      />

      <main className="app-main">
        {view === 'home' && (
          <HomePage
            onStart={() => setView('builder')}
            onSaved={() => setView('saved')}
            savedCount={savedWorkflows.length}
          />
        )}

        {view === 'builder' && (
          <div>
            <StepIndicator currentStep={step} />

            {/* Warn if not configured */}
            {!isConfigured && step <= 2 && (
              <ConfigWarning onOpenSettings={() => setShowSettings(true)} />
            )}

            {step === 1 && (
              <BusinessTypeStep
                selected={selectedBusinessType}
                onSelect={setSelectedBT}
                onNext={() => setStep(2)}
              />
            )}

            {step === 2 && (
              <GoalStep
                businessType={selectedBusinessType}
                selected={selectedGoal}
                onSelect={setSelectedGoal}
                onNext={handleGenerate}
                onBack={() => setStep(1)}
              />
            )}

            {step === 3 && (
              <WorkflowOutput
                isGenerating={isGenerating}
                error={genError}
                workflow={workflow}
                businessType={selectedBusinessType}
                goal={selectedGoal}
                onSave={handleSaveWorkflow}
                onReset={handleReset}
                onRetry={handleGenerate}
              />
            )}
          </div>
        )}

        {view === 'saved' && (
          <SavedWorkflows
            workflows={savedWorkflows}
            onLoad={handleLoadWorkflow}
            onDelete={handleDeleteWorkflow}
          />
        )}
      </main>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={handleSettingsSave}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
