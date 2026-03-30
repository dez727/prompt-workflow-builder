import { buildWorkflowPrompt } from './prompts.js'

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

/* ─── Claude API ────────────────────────────────────────────────────────────── */
async function callClaude(prompt, settings) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': settings.claudeApiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: settings.claudeModel || 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Claude API error ${res.status}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

/* ─── Ollama (OpenAI-compatible) ────────────────────────────────────────────── */
// Ollama calls are routed through the Vite dev-server proxy at /ollama
// to avoid CORS issues (browser → localhost:11434 cross-port block).
function ollamaBase(url) {
  const configured = url?.replace(/\/$/, '') || 'http://localhost:11434'
  // Localhost → use the Vite proxy path to sidestep CORS
  if (/localhost|127\.0\.0\.1/.test(configured)) return '/ollama'
  return configured
}

async function callOllama(prompt, settings) {
  const base = ollamaBase(settings.ollamaUrl)
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: settings.ollamaModel,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that responds only with valid JSON. Never include markdown, code fences, or explanation text — only raw JSON.',
        },
        { role: 'user', content: prompt },
      ],
      stream: false,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Ollama error ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

/* ─── List Ollama models ─────────────────────────────────────────────────────── */
export async function fetchOllamaModels(ollamaUrl) {
  const base = ollamaBase(ollamaUrl)
  const res = await fetch(`${base}/api/tags`)
  if (!res.ok) throw new Error(`Cannot reach Ollama at ${ollamaUrl || 'localhost:11434'}`)
  const data = await res.json()
  return (data.models ?? []).map((m) => m.name)
}

/* ─── Test connection ────────────────────────────────────────────────────────── */
export async function testConnection(settings) {
  if (settings.provider === 'claude') {
    if (!settings.claudeApiKey) throw new Error('No Claude API key configured.')
    // Minimal call to verify key
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': settings.claudeApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: settings.claudeModel || 'claude-opus-4-5',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message ?? `Status ${res.status}`)
    }
    return 'Claude API connected successfully.'
  }

  if (settings.provider === 'ollama') {
    const models = await fetchOllamaModels(settings.ollamaUrl)
    if (!models.length) throw new Error('Ollama is running but no models are installed.')
    return `Ollama connected. ${models.length} model${models.length !== 1 ? 's' : ''} available.`
  }

  throw new Error('No provider configured.')
}

/* ─── Main generate function ─────────────────────────────────────────────────── */
export async function generateWorkflow(businessType, goal, settings) {
  const prompt = buildWorkflowPrompt(businessType, goal)
  let rawText = ''

  if (settings.provider === 'claude') {
    if (!settings.claudeApiKey) throw new Error('Claude API key is not configured. Open Settings to add your key.')
    rawText = await callClaude(prompt, settings)
  } else if (settings.provider === 'ollama') {
    if (!settings.ollamaModel) throw new Error('No Ollama model selected. Open Settings to choose a model.')
    rawText = await callOllama(prompt, settings)
  } else {
    throw new Error('No AI provider configured. Open Settings to connect Claude API or a local Ollama model.')
  }

  const parsed = extractJSON(rawText)
  if (!parsed) {
    throw new Error(
      `Could not parse AI response as JSON. The model may not have followed the format.\n\nRaw output:\n${rawText.slice(0, 500)}`,
    )
  }

  return parsed
}
