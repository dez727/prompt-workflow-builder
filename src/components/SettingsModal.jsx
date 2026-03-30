import { useState } from 'react'
import { testConnection, fetchOllamaModels } from '../lib/aiProviders.js'

const CLAUDE_MODELS = [
  { value: 'claude-opus-4-5', label: 'Claude Opus 4.5 (Most capable)' },
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (Balanced)' },
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (Fast)' },
]

export default function SettingsModal({ settings, onSave, onClose }) {
  const [local, setLocal]       = useState({ ...settings })
  const [testing, setTesting]   = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [detecting, setDetecting] = useState(false)
  const [showKey, setShowKey]   = useState(false)

  const set = (key, val) => {
    setLocal((s) => ({ ...s, [key]: val }))
    setTestResult(null)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const msg = await testConnection(local)
      setTestResult({ type: 'success', msg })
    } catch (e) {
      setTestResult({ type: 'error', msg: e.message })
    } finally {
      setTesting(false)
    }
  }

  const handleDetectModels = async () => {
    setDetecting(true)
    setTestResult(null)
    try {
      const models = await fetchOllamaModels(local.ollamaUrl)
      if (!models.length) {
        setTestResult({ type: 'info', msg: 'Ollama reachable but no models installed. Run: ollama pull llama3.2' })
      } else {
        set('ollamaModels', models)
        if (!local.ollamaModel || !models.includes(local.ollamaModel)) {
          set('ollamaModel', models[0])
        }
        setTestResult({ type: 'success', msg: `Found ${models.length} model${models.length !== 1 ? 's' : ''}: ${models.join(', ')}` })
      }
    } catch (e) {
      setTestResult({ type: 'error', msg: e.message })
    } finally {
      setDetecting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">AI Provider Settings</span>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Provider tabs */}
          <div className="provider-tabs">
            <button
              className={`provider-tab ${local.provider === 'claude' ? 'active' : ''}`}
              onClick={() => set('provider', 'claude')}
            >
              Claude API
            </button>
            <button
              className={`provider-tab ${local.provider === 'ollama' ? 'active' : ''}`}
              onClick={() => set('provider', 'ollama')}
            >
              Local Model (Ollama)
            </button>
          </div>

          {/* Claude settings */}
          {local.provider === 'claude' && (
            <div>
              <div className="form-group">
                <label className="form-label">API Key</label>
                <div className="input-with-action">
                  <input
                    type={showKey ? 'text' : 'password'}
                    className="form-input"
                    placeholder="sk-ant-api03-…"
                    value={local.claudeApiKey}
                    onChange={(e) => set('claudeApiKey', e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowKey(!showKey)} type="button">
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="form-hint">
                  Get your key at{' '}
                  <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                    console.anthropic.com
                  </a>
                  . Stored in your browser only.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Model</label>
                <select
                  className="form-select"
                  value={local.claudeModel}
                  onChange={(e) => set('claudeModel', e.target.value)}
                >
                  {CLAUDE_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Ollama settings */}
          {local.provider === 'ollama' && (
            <div>
              <div className="form-group">
                <label className="form-label">Ollama URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={local.ollamaUrl}
                  onChange={(e) => set('ollamaUrl', e.target.value)}
                  placeholder="http://localhost:11434"
                  spellCheck={false}
                />
                <div className="form-hint">
                  Default is <code style={{ background: 'var(--rule)', padding: '1px 5px', borderRadius: 3 }}>http://localhost:11434</code>.
                  Install Ollama at{' '}
                  <a href="https://ollama.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>ollama.com</a>.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Model</label>
                <div className="input-with-action">
                  {local.ollamaModels?.length > 0 ? (
                    <select
                      className="form-select"
                      value={local.ollamaModel}
                      onChange={(e) => set('ollamaModel', e.target.value)}
                    >
                      {local.ollamaModels.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="form-input"
                      value={local.ollamaModel}
                      onChange={(e) => set('ollamaModel', e.target.value)}
                      placeholder="e.g. llama3.2, mistral, gemma2"
                      spellCheck={false}
                    />
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={handleDetectModels}
                    disabled={detecting}
                  >
                    {detecting ? '…' : 'Detect'}
                  </button>
                </div>
                <div className="form-hint">
                  Click Detect to auto-discover installed models. For best results: <code style={{ background: 'var(--rule)', padding: '1px 5px', borderRadius: 3 }}>ollama pull llama3.2</code>
                </div>
              </div>
            </div>
          )}

          {/* Test result */}
          {testResult && (
            <div className={`test-result ${testResult.type}`}>
              {testResult.type === 'success' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              )}
              {testResult.type === 'error' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
              )}
              {testResult.type === 'info' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              )}
              {testResult.msg}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleTest}
            disabled={testing || local.provider === 'none'}
          >
            {testing ? 'Testing…' : 'Test Connection'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(local)}>Save Settings</button>
        </div>
      </div>
    </div>
  )
}
