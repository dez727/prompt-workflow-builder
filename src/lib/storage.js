const SETTINGS_KEY = 'wfb_settings'
const WORKFLOWS_KEY = 'wfb_workflows'
const MAX_WORKFLOWS = 30

// API keys are stored in sessionStorage only — cleared on tab close, never persisted to disk
const API_KEY_FIELDS = ['claudeApiKey', 'openaiApiKey', 'geminiApiKey', 'openrouterApiKey']

const LEGACY_CLAUDE_MODEL_MAP = {
  'claude-opus-4-5': 'claude-opus-4-1-20250805',
  'claude-sonnet-4-5': 'claude-sonnet-4-20250514',
  'claude-haiku-4-5': 'claude-3-5-haiku-20241022',
}

const LEGACY_GEMINI_MODEL_MAP = {
  'gemini-2.5-pro': 'gemini-3.1-pro-preview',
  'gemini-2.5-flash': 'gemini-3-flash-preview',
  'gemini-2.5-flash-lite': 'gemini-3.1-flash-lite-preview',
  'gemini-2.0-flash': 'gemini-3-flash-preview',
  'gemini-2.0-flash-001': 'gemini-3-flash-preview',
  'gemini-2.0-flash-lite': 'gemini-3.1-flash-lite-preview',
  'gemini-2.0-flash-lite-001': 'gemini-3.1-flash-lite-preview',
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    const config = raw ? JSON.parse(raw) : {}

    if (config.claudeModel && LEGACY_CLAUDE_MODEL_MAP[config.claudeModel]) {
      config.claudeModel = LEGACY_CLAUDE_MODEL_MAP[config.claudeModel]
    }

    if (config.geminiModel && LEGACY_GEMINI_MODEL_MAP[config.geminiModel]) {
      config.geminiModel = LEGACY_GEMINI_MODEL_MAP[config.geminiModel]
    }

    // Merge API keys from sessionStorage
    const keys = {}
    for (const field of API_KEY_FIELDS) {
      const val = sessionStorage.getItem(`wfb_key_${field}`)
      if (val) keys[field] = val
    }

    return { ...defaultSettings(), ...config, ...keys }
  } catch {
    return defaultSettings()
  }
}

export function saveSettings(settings) {
  // Split: API keys → sessionStorage, everything else → localStorage
  const config = { ...settings }
  for (const field of API_KEY_FIELDS) {
    if (settings[field]) {
      sessionStorage.setItem(`wfb_key_${field}`, settings[field])
    } else {
      sessionStorage.removeItem(`wfb_key_${field}`)
    }
    delete config[field]
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(config))
}

export function defaultSettings() {
  return {
    provider: 'none',          // 'claude' | 'openai' | 'gemini' | 'openrouter' | 'ollama' | 'none'
    claudeApiKey: '',
    claudeModel: 'claude-opus-4-1-20250805',
    openaiApiKey: '',
    openaiModel: 'gpt-5.4-mini',
    geminiApiKey: '',
    geminiModel: 'gemini-3-flash-preview',
    openrouterApiKey: '',
    openrouterModel: 'openai/gpt-4.1-mini',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: '',
    ollamaModels: [],
  }
}

export function loadWorkflows() {
  try {
    const raw = localStorage.getItem(WORKFLOWS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function createWorkflowId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function saveWorkflow(entry) {
  const list = loadWorkflows()
  const newEntry = { id: createWorkflowId(), ...entry }
  const updated = [newEntry, ...list].slice(0, MAX_WORKFLOWS)
  localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(updated))
  return newEntry
}

export function deleteWorkflow(id) {
  const list = loadWorkflows().filter((w) => w.id !== id)
  localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(list))
}

export function exportWorkflowJSON(workflow, businessType, goal) {
  const blob = new Blob(
    [JSON.stringify({ businessType, goal, ...workflow }, null, 2)],
    { type: 'application/json' },
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${workflow.workflowName?.replace(/\s+/g, '-').toLowerCase() ?? 'workflow'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function buildClipboardText(workflow) {
  const lines = []
  lines.push(`# ${workflow.workflowName}`)
  lines.push(workflow.summary)
  lines.push('')
  lines.push(`Setup time: ${workflow.estimatedSetupTime} | Difficulty: ${workflow.difficulty}`)
  lines.push('')
  lines.push('## Workflow Steps')
  workflow.workflow?.forEach((s) =>
    lines.push(`${s.id}. [${s.type?.toUpperCase()}] ${s.step} — ${s.tool}`),
  )
  lines.push('')
  lines.push('## Recommended Tools')
  workflow.recommendedTools?.forEach((t) =>
    lines.push(`- ${t.name} (${t.priority}) — ${t.cost}`),
  )
  lines.push('')
  lines.push('## Starter Prompts')
  workflow.starterPrompts?.forEach((p) => {
    lines.push(`### ${p.title}`)
    lines.push(p.prompt)
    lines.push('')
  })
  lines.push('## Implementation Steps')
  workflow.implementationSteps?.forEach((s) =>
    lines.push(`${s.step}. ${s.action} (${s.timeEstimate})\n   ${s.detail}`),
  )
  if (workflow.proTips?.length) {
    lines.push('')
    lines.push('## Pro Tips')
    workflow.proTips.forEach((t) => lines.push(`- ${t}`))
  }
  return lines.join('\n')
}
