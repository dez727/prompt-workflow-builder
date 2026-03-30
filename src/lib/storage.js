const SETTINGS_KEY = 'wfb_settings'
const WORKFLOWS_KEY = 'wfb_workflows'
const MAX_WORKFLOWS = 30

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaultSettings()
    return { ...defaultSettings(), ...JSON.parse(raw) }
  } catch {
    return defaultSettings()
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function defaultSettings() {
  return {
    provider: 'none',          // 'claude' | 'ollama' | 'none'
    claudeApiKey: '',
    claudeModel: 'claude-opus-4-5',
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

export function saveWorkflow(entry) {
  const list = loadWorkflows()
  const newEntry = { id: Date.now().toString(), ...entry }
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
