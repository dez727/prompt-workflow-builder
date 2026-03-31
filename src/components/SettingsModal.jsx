import { useState } from 'react'
import { testConnection, fetchOllamaModels } from '../lib/aiProviders.js'

const PROVIDERS = [
  { value: 'claude', label: 'Claude' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'ollama', label: 'Ollama' },
]

const CLAUDE_MODELS = [
  { value: 'claude-opus-4-1-20250805', label: 'Claude Opus 4.1 (Most capable)' },
  { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Balanced)' },
  { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet v2' },
  { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Fast)' },
  { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
]

const OPENAI_MODELS = [
  { value: 'gpt-5.4', label: 'GPT-5.4 (Latest flagship)' },
  { value: 'gpt-5.4-mini', label: 'GPT-5.4 mini (Best default)' },
  { value: 'gpt-5.4-nano', label: 'GPT-5.4 nano (Lowest cost)' },
  { value: 'gpt-5.1', label: 'GPT-5.1 (Coding and agentic)' },
  { value: 'gpt-5-pro', label: 'GPT-5 pro (Highest effort, most expensive)' },
  { value: 'gpt-5', label: 'GPT-5' },
  { value: 'gpt-5-mini', label: 'GPT-5 mini' },
  { value: 'gpt-5-nano', label: 'GPT-5 nano' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  { value: 'gpt-4.1-nano', label: 'GPT-4.1 nano' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
]

const GEMINI_MODELS = [
  { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview (Most capable)' },
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview (Balanced)' },
  { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash-Lite Preview (Fastest)' },
]

function ApiKeyField({ value, onChange, placeholder, showKey, onToggle, hintUrl, hintLabel }) {
  return (
    <div className="form-group">
      <label className="form-label">API Key</label>
      <div className="input-with-action">
        <input
          type={showKey ? 'text' : 'password'}
          className="form-input"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete="off"
          spellCheck={false}
        />
        <button className="btn btn-ghost btn-sm" onClick={onToggle} type="button">
          {showKey ? 'Hide' : 'Show'}
        </button>
      </div>
      <div className="form-hint">
        Get your key at{' '}
        <a href={hintUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
          {hintLabel}
        </a>
        . Stored in your browser only.
      </div>
    </div>
  )
}

export default function SettingsModal({ settings, onSave, onClose }) {
  const [local, setLocal] = useState({
    ...settings,
    provider: settings.provider === 'none' ? 'claude' : settings.provider,
  })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [detecting, setDetecting] = useState(false)
  const [showKey, setShowKey] = useState(false)

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
          <div className="provider-tabs">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.value}
                className={`provider-tab ${local.provider === provider.value ? 'active' : ''}`}
                onClick={() => set('provider', provider.value)}
              >
                {provider.label}
              </button>
            ))}
          </div>

          {local.provider === 'claude' && (
            <div>
              <ApiKeyField
                value={local.claudeApiKey}
                onChange={(e) => set('claudeApiKey', e.target.value)}
                placeholder="sk-ant-api03-..."
                showKey={showKey}
                onToggle={() => setShowKey(!showKey)}
                hintUrl="https://console.anthropic.com"
                hintLabel="console.anthropic.com"
              />

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

          {local.provider === 'openai' && (
            <div>
              <ApiKeyField
                value={local.openaiApiKey}
                onChange={(e) => set('openaiApiKey', e.target.value)}
                placeholder="sk-proj-..."
                showKey={showKey}
                onToggle={() => setShowKey(!showKey)}
                hintUrl="https://platform.openai.com/api-keys"
                hintLabel="platform.openai.com/api-keys"
              />

              <div className="form-group">
                <label className="form-label">Model</label>
                <select
                  className="form-select"
                  value={local.openaiModel}
                  onChange={(e) => set('openaiModel', e.target.value)}
                >
                  {OPENAI_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {local.provider === 'gemini' && (
            <div>
              <ApiKeyField
                value={local.geminiApiKey}
                onChange={(e) => set('geminiApiKey', e.target.value)}
                placeholder="AIza..."
                showKey={showKey}
                onToggle={() => setShowKey(!showKey)}
                hintUrl="https://aistudio.google.com/app/apikey"
                hintLabel="aistudio.google.com"
              />

              <div className="form-group">
                <label className="form-label">Model</label>
                <select
                  className="form-select"
                  value={local.geminiModel}
                  onChange={(e) => set('geminiModel', e.target.value)}
                >
                  {GEMINI_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {local.provider === 'openrouter' && (
            <div>
              <ApiKeyField
                value={local.openrouterApiKey}
                onChange={(e) => set('openrouterApiKey', e.target.value)}
                placeholder="sk-or-v1-..."
                showKey={showKey}
                onToggle={() => setShowKey(!showKey)}
                hintUrl="https://openrouter.ai/keys"
                hintLabel="openrouter.ai/keys"
              />

              <div className="form-group">
                <label className="form-label">Model</label>
                <input
                  type="text"
                  className="form-input"
                  value={local.openrouterModel}
                  onChange={(e) => set('openrouterModel', e.target.value)}
                  placeholder="e.g. openai/gpt-4.1-mini"
                  spellCheck={false}
                />
                <div className="form-hint">
                  Enter any OpenRouter model slug, such as <code style={{ background: 'var(--rule)', padding: '1px 5px', borderRadius: 3 }}>openai/gpt-4.1-mini</code> or <code style={{ background: 'var(--rule)', padding: '1px 5px', borderRadius: 3 }}>google/gemini-2.5-flash</code>.
                </div>
              </div>
            </div>
          )}

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
            disabled={testing}
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
