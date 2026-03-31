import { buildWorkflowPrompt } from './prompts.js'

const WORKFLOW_STEP_TYPES = new Set(['trigger', 'ai', 'action', 'human', 'filter'])
const TOOL_CATEGORIES = new Set(['automation', 'ai', 'crm', 'communication', 'analytics', 'other'])
const TOOL_PRIORITIES = new Set(['essential', 'recommended', 'optional'])
const SUSPICIOUS_OUTPUT_PATTERNS = [
  /-----BEGIN (?:RSA|EC|DSA|OPENSSH|PGP)? ?PRIVATE KEY-----/i,
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
  /\bAIza[0-9A-Za-z\-_]{20,}\b/,
]

/* ─── JSON extraction ──────────────────────────────────────────────────────── */
function extractJSON(text) {
  // 1. Direct parse
  try { return JSON.parse(text.trim()) } catch {}

  // 2. Strip markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) } catch {}
  }

  // 3. Find first { ... last }
  const start = text.indexOf('{')
  const end   = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)) } catch {}
  }

  return null
}

function sanitizeUiError(message, fallback) {
  const text = String(message || '').trim()
  if (!text) return fallback

  // Keep short, user-actionable messages and avoid surfacing provider payloads.
  if (text.length > 160) return fallback

  const sensitivePatterns = [
    /org[_-\s]?id/i,
    /organization/i,
    /project[_-\s]?id/i,
    /quota/i,
    /billing/i,
    /balance/i,
    /credit/i,
    /request[_-\s]?id/i,
    /trace[_-\s]?id/i,
  ]

  if (sensitivePatterns.some((pattern) => pattern.test(text))) {
    return fallback
  }

  return text
}

function buildParseFailureMessage(settings) {
  const providerLabel = settings.provider === 'openai'
    ? 'OpenAI'
    : settings.provider === 'openrouter'
      ? 'OpenRouter'
      : settings.provider === 'ollama'
        ? 'Ollama'
        : settings.provider === 'gemini'
          ? 'Gemini'
          : 'Claude'

  return `${providerLabel} returned an unexpected response format. Try again, switch to another model, or test the connection in Settings.`
}

function buildValidationFailureMessage(settings) {
  const providerLabel = settings.provider === 'openai'
    ? 'OpenAI'
    : settings.provider === 'openrouter'
      ? 'OpenRouter'
      : settings.provider === 'ollama'
        ? 'Ollama'
        : settings.provider === 'gemini'
          ? 'Gemini'
          : 'Claude'

  return `${providerLabel} returned a workflow that did not match the expected schema. Try again or switch to another model.`
}

function expectString(value, field, maxLength, minLength = 1) {
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string.`)
  }

  const trimmed = value.trim()
  if (trimmed.length < minLength || trimmed.length > maxLength) {
    throw new Error(`${field} is outside the allowed length range.`)
  }

  if (SUSPICIOUS_OUTPUT_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    throw new Error(`${field} contains sensitive output.`)
  }

  return trimmed
}

function expectArray(value, field, minLength, maxLength) {
  if (!Array.isArray(value) || value.length < minLength || value.length > maxLength) {
    throw new Error(`${field} must contain ${minLength}-${maxLength} items.`)
  }

  return value
}

function validateWorkflowShape(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Workflow response must be an object.')
  }

  expectString(data.workflowName, 'workflowName', 140)
  expectString(data.summary, 'summary', 500, 20)
  expectString(data.estimatedSetupTime, 'estimatedSetupTime', 40, 2)
  expectString(data.difficulty, 'difficulty', 40, 2)

  const workflowSteps = expectArray(data.workflow, 'workflow', 4, 7)
  workflowSteps.forEach((step, index) => {
    if (!step || typeof step !== 'object' || Array.isArray(step)) {
      throw new Error(`workflow[${index}] must be an object.`)
    }

    if (!Number.isInteger(step.id) || step.id < 1) {
      throw new Error(`workflow[${index}].id must be a positive integer.`)
    }

    expectString(step.step, `workflow[${index}].step`, 120)
    expectString(step.description, `workflow[${index}].description`, 300, 12)
    expectString(step.tool, `workflow[${index}].tool`, 120)

    const type = expectString(step.type, `workflow[${index}].type`, 24).toLowerCase()
    if (!WORKFLOW_STEP_TYPES.has(type)) {
      throw new Error(`workflow[${index}].type is invalid.`)
    }
  })

  const recommendedTools = expectArray(data.recommendedTools, 'recommendedTools', 3, 5)
  recommendedTools.forEach((tool, index) => {
    if (!tool || typeof tool !== 'object' || Array.isArray(tool)) {
      throw new Error(`recommendedTools[${index}] must be an object.`)
    }

    expectString(tool.name, `recommendedTools[${index}].name`, 120)
    expectString(tool.reason, `recommendedTools[${index}].reason`, 300, 12)
    expectString(tool.cost, `recommendedTools[${index}].cost`, 120, 2)

    const category = expectString(tool.category, `recommendedTools[${index}].category`, 32).toLowerCase()
    if (!TOOL_CATEGORIES.has(category)) {
      throw new Error(`recommendedTools[${index}].category is invalid.`)
    }

    const priority = expectString(tool.priority, `recommendedTools[${index}].priority`, 32).toLowerCase()
    if (!TOOL_PRIORITIES.has(priority)) {
      throw new Error(`recommendedTools[${index}].priority is invalid.`)
    }
  })

  const categories = new Set(recommendedTools.map((tool) => String(tool.category).toLowerCase()))
  if (!categories.has('automation') || !categories.has('ai')) {
    throw new Error('recommendedTools must include at least one automation tool and one AI tool.')
  }

  const starterPrompts = expectArray(data.starterPrompts, 'starterPrompts', 2, 4)
  starterPrompts.forEach((promptEntry, index) => {
    if (!promptEntry || typeof promptEntry !== 'object' || Array.isArray(promptEntry)) {
      throw new Error(`starterPrompts[${index}] must be an object.`)
    }

    expectString(promptEntry.title, `starterPrompts[${index}].title`, 120)
    expectString(promptEntry.useCase, `starterPrompts[${index}].useCase`, 220, 8)
    expectString(promptEntry.prompt, `starterPrompts[${index}].prompt`, 2_000, 50)
  })

  const implementationSteps = expectArray(data.implementationSteps, 'implementationSteps', 5, 8)
  implementationSteps.forEach((step, index) => {
    if (!step || typeof step !== 'object' || Array.isArray(step)) {
      throw new Error(`implementationSteps[${index}] must be an object.`)
    }

    if (!Number.isInteger(step.step) || step.step < 1) {
      throw new Error(`implementationSteps[${index}].step must be a positive integer.`)
    }

    expectString(step.action, `implementationSteps[${index}].action`, 160)
    expectString(step.detail, `implementationSteps[${index}].detail`, 400, 12)
    expectString(step.timeEstimate, `implementationSteps[${index}].timeEstimate`, 40, 2)
  })

  const proTips = expectArray(data.proTips, 'proTips', 3, 5)
  proTips.forEach((tip, index) => {
    expectString(tip, `proTips[${index}]`, 220, 12)
  })

  return data
}

/* ─── Backend call helper ──────────────────────────────────────────────────── */
async function callBackend(path, body, apiKey) {
  const headers = { 'content-type': 'application/json' }
  if (apiKey) headers['x-api-key'] = apiKey

  const res = await fetch(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(sanitizeUiError(data.error, `Request failed (${res.status}). Please try again.`))
  return data.text ?? ''
}

/* ─── Provider calls ────────────────────────────────────────────────────────── */

function callClaude(prompt, settings) {
  return callBackend('/api/claude', {
    model: settings.claudeModel || 'claude-opus-4-1-20250805',
    prompt,
    maxTokens: 4096,
  }, settings.claudeApiKey)
}

function callOpenAI(prompt, settings) {
  return callBackend('/api/openai', {
    model: settings.openaiModel || 'gpt-5.4-mini',
    prompt,
  }, settings.openaiApiKey)
}

function callGemini(prompt, settings) {
  return callBackend('/api/gemini', {
    model: settings.geminiModel || 'gemini-3-flash-preview',
    prompt,
    responseMimeType: 'application/json',
    systemInstruction: 'You are a helpful assistant that responds only with valid JSON. Never include markdown, code fences, or explanation text, only raw JSON.',
  }, settings.geminiApiKey)
}

function callOpenRouter(prompt, settings) {
  return callBackend('/api/openrouter', {
    model: settings.openrouterModel || 'openai/gpt-4.1-mini',
    prompt,
  }, settings.openrouterApiKey)
}

function callOllama(prompt, settings) {
  return callBackend('/api/ollama', {
    model: settings.ollamaModel,
    prompt,
    ollamaUrl: settings.ollamaUrl || 'http://localhost:11434',
  }, null)
}

/* ─── List Ollama models ─────────────────────────────────────────────────────── */
export async function fetchOllamaModels(ollamaUrl) {
  const res = await fetch(`/api/ollama/models?url=${encodeURIComponent(ollamaUrl || 'http://localhost:11434')}`)
  const data = await res.json()
  if (!res.ok) throw new Error(sanitizeUiError(data.error, `Could not load Ollama models (${res.status}).`))
  return data.models ?? []
}

/* ─── Test connection ────────────────────────────────────────────────────────── */
export async function testConnection(settings) {
  const headers = { 'content-type': 'application/json' }
  const apiKey = settings.claudeApiKey || settings.openaiApiKey || settings.geminiApiKey || settings.openrouterApiKey
  if (apiKey) headers['x-api-key'] = apiKey

  const res = await fetch('/api/test', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      provider: settings.provider,
      model: settings.claudeModel || settings.openaiModel || settings.geminiModel || settings.openrouterModel,
      ollamaUrl: settings.ollamaUrl,
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(sanitizeUiError(data.error, `Connection test failed (${res.status}). Please try again.`))
  return data.message
}

/* ─── Main generate function ─────────────────────────────────────────────────── */
export async function generateWorkflow(businessType, goal, settings) {
  const prompt = buildWorkflowPrompt(businessType, goal)
  let rawText = ''

  if (settings.provider === 'claude') {
    if (!settings.claudeApiKey) throw new Error('Claude API key is not configured. Open Settings to add your key.')
    rawText = await callClaude(prompt, settings)
  } else if (settings.provider === 'openai') {
    if (!settings.openaiApiKey) throw new Error('OpenAI API key is not configured. Open Settings to add your key.')
    rawText = await callOpenAI(prompt, settings)
  } else if (settings.provider === 'gemini') {
    if (!settings.geminiApiKey) throw new Error('Gemini API key is not configured. Open Settings to add your key.')
    rawText = await callGemini(prompt, settings)
  } else if (settings.provider === 'openrouter') {
    if (!settings.openrouterApiKey) throw new Error('OpenRouter API key is not configured. Open Settings to add your key.')
    rawText = await callOpenRouter(prompt, settings)
  } else if (settings.provider === 'ollama') {
    if (!settings.ollamaModel) throw new Error('No Ollama model selected. Open Settings to choose a model.')
    rawText = await callOllama(prompt, settings)
  } else {
    throw new Error('No AI provider configured. Open Settings to connect Claude, OpenAI, Gemini, OpenRouter, or a local Ollama model.')
  }

  const parsed = extractJSON(rawText)
  if (!parsed) {
    throw new Error(buildParseFailureMessage(settings))
  }

  try {
    return validateWorkflowShape(parsed)
  } catch {
    throw new Error(buildValidationFailureMessage(settings))
  }
}
