import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createHmac, timingSafeEqual, randomUUID } from 'crypto'
import { OAuth2Client } from 'google-auth-library'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(express.json({ limit: '1mb' }))
app.disable('x-powered-by')

const PORT = process.env.PORT || 3001
const IS_PROD = process.env.NODE_ENV === 'production'
const TRUST_PROXY = process.env.TRUST_PROXY?.trim() ?? ''
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.trim() ?? ''
const SESSION_SECRET = process.env.APP_SESSION_SECRET?.trim() ?? ''
const SESSION_TTL_HOURS = Number(process.env.APP_SESSION_TTL_HOURS || 12)
const AUTH_ENABLED = Boolean(GOOGLE_CLIENT_ID)
const SESSION_COOKIE_NAME = 'pwb_session'
const ALLOWED_GOOGLE_EMAILS = process.env.GOOGLE_ALLOWED_EMAILS
  ? process.env.GOOGLE_ALLOWED_EMAILS.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean)
  : []
const ALLOWED_GOOGLE_DOMAINS = process.env.GOOGLE_ALLOWED_DOMAINS
  ? process.env.GOOGLE_ALLOWED_DOMAINS.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean)
  : []
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 25000)
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000)
const RATE_LIMIT_GENERATE = Number(process.env.RATE_LIMIT_GENERATE || 20)
const RATE_LIMIT_TEST = Number(process.env.RATE_LIMIT_TEST || 8)
const RATE_LIMIT_OLLAMA = Number(process.env.RATE_LIMIT_OLLAMA || 12)
const MAX_PROMPT_CHARS = Number(process.env.MAX_PROMPT_CHARS || 10_000)
const MAX_RESPONSE_TOKENS = Number(process.env.MAX_RESPONSE_TOKENS || 4096)
const RATE_LIMIT_STORE = new Map()

if (TRUST_PROXY) {
  const normalized = TRUST_PROXY.toLowerCase()
  const trustProxyValue = normalized === 'true'
    ? true
    : normalized === 'false'
      ? false
      : /^\d+$/.test(TRUST_PROXY)
        ? Number(TRUST_PROXY)
        : TRUST_PROXY

  app.set('trust proxy', trustProxyValue)
}

if (AUTH_ENABLED && !SESSION_SECRET) {
  throw new Error('APP_SESSION_SECRET is required when GOOGLE_CLIENT_ID is set.')
}

/* ─── Ollama URL validation ──────────────────────────────────────────────────── */
// Allowed origins beyond localhost can be configured via env var, e.g.:
//   OLLAMA_ALLOWED_ORIGINS=http://192.168.1.100:11434,http://gpu-box:11434
const EXTRA_OLLAMA_ORIGINS = process.env.OLLAMA_ALLOWED_ORIGINS
  ? process.env.OLLAMA_ALLOWED_ORIGINS.split(',').map((s) => s.trim().replace(/\/$/, ''))
  : []

function validateOllamaUrl(raw) {
  const urlStr = (raw ?? '').trim() || 'http://localhost:11434'
  let parsed
  try {
    parsed = new URL(urlStr)
  } catch {
    return null // unparseable
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null

  const hostname = parsed.hostname.toLowerCase()
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return urlStr.replace(/\/$/, '')
  }

  const origin = parsed.origin
  if (EXTRA_OLLAMA_ORIGINS.includes(origin)) return urlStr.replace(/\/$/, '')

  return null // rejected
}

const JSON_ONLY_SYSTEM_PROMPT =
  'You are a helpful assistant that responds only with valid JSON. Never include markdown, code fences, or explanation text, only raw JSON.'

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all|any|previous|prior)\s+instructions/i,
  /forget\s+(all|any|previous|prior)\s+instructions/i,
  /disregard\s+(all|any|previous|prior)\s+instructions/i,
  /reveal\s+(the\s+)?(system|hidden)\s+prompt/i,
  /developer\s+message/i,
  /bypass\s+(safety|guardrails|filters)/i,
]

const SENSITIVE_INPUT_PATTERNS = [
  /-----BEGIN (?:RSA|EC|DSA|OPENSSH|PGP)? ?PRIVATE KEY-----/i,
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
  /\bAIza[0-9A-Za-z\-_]{20,}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/i,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/i,
  /\b\d{3}-\d{2}-\d{4}\b/,
]

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

app.use((req, res, next) => {
  req.requestId = randomUUID()
  res.setHeader('X-Request-Id', req.requestId)
  next()
})

function buildMessages(prompt) {
  return [
    { role: 'system', content: JSON_ONLY_SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ]
}

function normalizeGoogleUser(payload) {
  return {
    sub: payload.sub,
    email: payload.email ?? '',
    name: payload.name ?? '',
    picture: payload.picture ?? '',
  }
}

function isAllowedGoogleUser(user) {
  if (!user.email) return false
  if (ALLOWED_GOOGLE_EMAILS.length && !ALLOWED_GOOGLE_EMAILS.includes(user.email.toLowerCase())) {
    return false
  }

  if (ALLOWED_GOOGLE_DOMAINS.length) {
    const domain = user.email.split('@')[1]?.toLowerCase() ?? ''
    if (!ALLOWED_GOOGLE_DOMAINS.includes(domain)) return false
  }

  return true
}

function parseCookies(req) {
  const header = req.headers.cookie ?? ''
  const pairs = header.split(';').map((chunk) => chunk.trim()).filter(Boolean)
  const cookies = {}

  for (const pair of pairs) {
    const idx = pair.indexOf('=')
    if (idx === -1) continue
    const key = pair.slice(0, idx)
    const value = pair.slice(idx + 1)
    cookies[key] = decodeURIComponent(value)
  }

  return cookies
}

function signSessionPayload(payload) {
  return createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url')
}

function createSessionToken(user) {
  const payload = Buffer.from(JSON.stringify({
    exp: Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000,
    user,
  })).toString('base64url')

  return `${payload}.${signSessionPayload(payload)}`
}

function verifySessionToken(token) {
  if (!AUTH_ENABLED) return { authenticated: true, user: null }
  if (!token || typeof token !== 'string') return { authenticated: false, user: null }

  const [payload, signature] = token.split('.')
  if (!payload || !signature) return { authenticated: false, user: null }

  const expected = signSessionPayload(payload)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (signatureBuffer.length !== expectedBuffer.length) return { authenticated: false, user: null }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return { authenticated: false, user: null }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof decoded.exp !== 'number' || decoded.exp <= Date.now()) {
      return { authenticated: false, user: null }
    }

    return {
      authenticated: true,
      user: decoded.user ?? null,
    }
  } catch {
    return { authenticated: false, user: null }
  }
}

function buildSessionCookie(value, maxAgeSeconds) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ]

  if (IS_PROD) parts.push('Secure')
  return parts.join('; ')
}

function requireAppSession(req, res, next) {
  if (!AUTH_ENABLED) return next()
  if (req.path.startsWith('/auth/')) return next()

  const cookies = parseCookies(req)
  const session = verifySessionToken(cookies[SESSION_COOKIE_NAME])
  if (session.authenticated) {
    req.auth = session
    return next()
  }

  return res.status(401).json({ error: 'Sign in required.' })
}

function titleCaseProvider(provider) {
  return provider === 'openai'
    ? 'OpenAI'
    : provider === 'openrouter'
      ? 'OpenRouter'
      : provider === 'ollama'
        ? 'Ollama'
        : provider.charAt(0).toUpperCase() + provider.slice(1)
}

function sanitizeProviderError(provider, status, details = '') {
  const name = titleCaseProvider(provider)
  const text = String(details).toLowerCase()

  if (status === 401 || status === 403 || text.includes('invalid api key') || text.includes('authentication')) {
    return `Authentication failed. Check your ${name} API key and permissions.`
  }

  if (status === 429 || text.includes('rate limit') || text.includes('quota') || text.includes('billing')) {
    return `${name} rate limit or quota reached. Check your account and try again.`
  }

  if (status === 404 || text.includes('model') || text.includes('not found') || text.includes('unsupported')) {
    return `The selected ${name} model is unavailable. Choose another model and try again.`
  }

  if (status >= 500) {
    return `${name} is temporarily unavailable. Please try again in a moment.`
  }

  if (status >= 400) {
    return `${name} could not process the request. Review your settings and try again.`
  }

  return `${name} request failed. Please try again.`
}

function sanitizeNetworkError(provider, reason = 'network') {
  const name = titleCaseProvider(provider)
  if (reason === 'timeout') {
    return `${name} request timed out. Please try again.`
  }

  return provider === 'ollama'
    ? 'Cannot reach Ollama. Confirm the local server is running and the URL is correct.'
    : `Could not reach ${name}. Please try again.`
}

function getClientFingerprint(req) {
  const trustedIp = typeof req.ip === 'string' ? req.ip.trim() : ''
  const socketIp = typeof req.socket?.remoteAddress === 'string' ? req.socket.remoteAddress.trim() : ''
  return trustedIp || socketIp || 'unknown'
}

function logSecurityEvent(level, event, req, details = {}) {
  const record = {
    ts: new Date().toISOString(),
    level,
    event,
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    client: getClientFingerprint(req),
    user: req.auth?.user?.email ?? null,
    ...details,
  }

  const message = JSON.stringify(record)
  if (level === 'error') {
    console.error(message)
  } else if (level === 'warn') {
    console.warn(message)
  } else {
    console.log(message)
  }
}

function cleanupRateLimitBucket(now = Date.now()) {
  for (const [key, entry] of RATE_LIMIT_STORE.entries()) {
    if (entry.resetAt <= now) RATE_LIMIT_STORE.delete(key)
  }
}

function enforceRateLimit(req, res, bucket, limit, windowMs = RATE_LIMIT_WINDOW_MS) {
  cleanupRateLimitBucket()

  const now = Date.now()
  const key = `${bucket}:${getClientFingerprint(req)}`
  const current = RATE_LIMIT_STORE.get(key)
  const entry = current && current.resetAt > now
    ? current
    : { count: 0, resetAt: now + windowMs }

  entry.count += 1
  RATE_LIMIT_STORE.set(key, entry)

  const remaining = Math.max(0, limit - entry.count)
  res.setHeader('X-RateLimit-Limit', String(limit))
  res.setHeader('X-RateLimit-Remaining', String(remaining))
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)))

  if (entry.count > limit) {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))))
    logSecurityEvent('warn', 'rate_limit_exceeded', req, {
      bucket,
      limit,
      remaining,
    })
    res.status(429).json({
      error: 'Too many requests. Please wait a moment and try again.',
      requestId: req.requestId,
    })
    return false
  }

  return true
}

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

function clampMaxTokens(value, fallback = MAX_RESPONSE_TOKENS) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(Math.floor(parsed), MAX_RESPONSE_TOKENS)
}

function getPromptRisk(prompt) {
  const text = String(prompt ?? '').trim()
  if (!text) {
    return { ok: false, message: 'Prompt content is required.' }
  }

  if (text.length > MAX_PROMPT_CHARS) {
    return {
      ok: false,
      message: `Prompt is too large. Reduce the request to ${MAX_PROMPT_CHARS.toLocaleString()} characters or fewer.`,
    }
  }

  if (SENSITIVE_INPUT_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      ok: false,
      message: 'Sensitive credentials or personal data were detected in the request. Remove secrets or regulated data before sending it to a model.',
    }
  }

  if (PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      ok: false,
      message: 'The request contains prompt-injection style instructions. Rephrase it as business context or workflow goals only.',
    }
  }

  return { ok: true, text }
}

function validateGenerationRequest(req, res) {
  const model = String(req.body?.model ?? '').trim()
  if (!model) {
    logSecurityEvent('warn', 'blocked_generation_request', req, { reason: 'missing_model' })
    res.status(400).json({ error: 'Model is required.', requestId: req.requestId })
    return null
  }

  const promptRisk = getPromptRisk(req.body?.prompt)
  if (!promptRisk.ok) {
    logSecurityEvent('warn', 'blocked_generation_request', req, {
      reason: promptRisk.message,
      model,
    })
    res.status(400).json({ error: promptRisk.message, requestId: req.requestId })
    return null
  }

  return {
    model,
    prompt: promptRisk.text,
  }
}

async function readErrorMessage(res, provider) {
  const ct = res.headers.get('content-type') ?? ''
  let details = ''

  if (ct.includes('application/json')) {
    const err = await res.json().catch(() => ({}))
    details = err?.error?.message ?? err?.message ?? ''
  } else {
    details = await res.text().catch(() => '')
  }

  return sanitizeProviderError(provider, res.status, details)
}

/* ─── Access gate ───────────────────────────────────────────────────────────── */

app.get('/api/auth/session', (req, res) => {
  const cookies = parseCookies(req)
  const session = verifySessionToken(cookies[SESSION_COOKIE_NAME])

  return res.json({
    enabled: AUTH_ENABLED,
    googleClientId: AUTH_ENABLED ? GOOGLE_CLIENT_ID : null,
    authenticated: session.authenticated,
    user: session.user,
  })
})

app.post('/api/auth/google', async (req, res) => {
  if (!AUTH_ENABLED) {
    return res.json({ enabled: false, authenticated: true, user: null })
  }

  const credential = String(req.body?.credential ?? '')
  if (!credential) {
    return res.status(400).json({ error: 'Missing Google credential.' })
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      return res.status(401).json({ error: 'Verified Google account email is required.' })
    }

    const user = normalizeGoogleUser(payload)
    if (!isAllowedGoogleUser(user)) {
      return res.status(403).json({ error: 'This Google account is not allowed to access the app.' })
    }

    const maxAgeSeconds = Math.max(1, Math.floor(SESSION_TTL_HOURS * 60 * 60))
    res.setHeader('Set-Cookie', buildSessionCookie(createSessionToken(user), maxAgeSeconds))
    return res.json({ enabled: true, authenticated: true, user })
  } catch {
    return res.status(401).json({ error: 'Google sign-in could not be verified.' })
  }
})

app.post('/api/auth/logout', (_req, res) => {
  res.setHeader('Set-Cookie', buildSessionCookie('', 0))
  return res.json({ ok: true })
})

app.use('/api', requireAppSession)

/* ─── Claude ─────────────────────────────────────────────────────────────────── */

app.post('/api/claude', async (req, res) => {
  if (!enforceRateLimit(req, res, 'generate', RATE_LIMIT_GENERATE)) return

  const payload = validateGenerationRequest(req, res)
  if (!payload) return

  const { model, prompt } = payload
  const apiKey = req.headers['x-api-key']
  if (!apiKey) return res.status(400).json({ error: 'Missing API key' })

  try {
    const upstream = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: clampMaxTokens(req.body?.maxTokens),
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: await readErrorMessage(upstream, 'claude'),
      })
    }

    const data = await upstream.json()
    res.json({ text: data.content?.[0]?.text ?? '' })
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : 'network'
    logSecurityEvent('warn', 'upstream_request_failed', req, { provider: 'claude', reason })
    res.status(502).json({ error: sanitizeNetworkError('claude', reason), requestId: req.requestId })
  }
})

/* ─── OpenAI ─────────────────────────────────────────────────────────────────── */

app.post('/api/openai', async (req, res) => {
  if (!enforceRateLimit(req, res, 'generate', RATE_LIMIT_GENERATE)) return

  const payload = validateGenerationRequest(req, res)
  if (!payload) return

  const { model, prompt } = payload
  const apiKey = req.headers['x-api-key']
  if (!apiKey) return res.status(400).json({ error: 'Missing API key' })

  const body = {
    model,
    messages: buildMessages(prompt),
    stream: false,
    response_format: { type: 'json_object' },
  }
  if (req.body?.maxTokens) body.max_tokens = clampMaxTokens(req.body.maxTokens)

  try {
    const upstream = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: await readErrorMessage(upstream, 'openai'),
      })
    }

    const data = await upstream.json()
    res.json({ text: data.choices?.[0]?.message?.content ?? '' })
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : 'network'
    logSecurityEvent('warn', 'upstream_request_failed', req, { provider: 'openai', reason })
    res.status(502).json({ error: sanitizeNetworkError('openai', reason), requestId: req.requestId })
  }
})

/* ─── Gemini ─────────────────────────────────────────────────────────────────── */

app.post('/api/gemini', async (req, res) => {
  if (!enforceRateLimit(req, res, 'generate', RATE_LIMIT_GENERATE)) return

  const payload = validateGenerationRequest(req, res)
  if (!payload) return

  const { model, prompt } = payload
  const systemInstruction = String(req.body?.systemInstruction ?? '').trim()
  const responseMimeType = String(req.body?.responseMimeType ?? '').trim()
  const apiKey = req.headers['x-api-key']
  if (!apiKey) return res.status(400).json({ error: 'Missing API key' })

  try {
    const upstream = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...(systemInstruction
            ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
            : {}),
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          ...(responseMimeType ? { generationConfig: { responseMimeType } } : {}),
        }),
      },
    )

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: await readErrorMessage(upstream, 'gemini'),
      })
    }

    const data = await upstream.json()
    const parts = data.candidates?.[0]?.content?.parts ?? []
    res.json({ text: parts.map((p) => p?.text ?? '').join('') })
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : 'network'
    logSecurityEvent('warn', 'upstream_request_failed', req, { provider: 'gemini', reason })
    res.status(502).json({ error: sanitizeNetworkError('gemini', reason), requestId: req.requestId })
  }
})

/* ─── OpenRouter ─────────────────────────────────────────────────────────────── */

app.post('/api/openrouter', async (req, res) => {
  if (!enforceRateLimit(req, res, 'generate', RATE_LIMIT_GENERATE)) return

  const payload = validateGenerationRequest(req, res)
  if (!payload) return

  const { model, prompt } = payload
  const apiKey = req.headers['x-api-key']
  if (!apiKey) return res.status(400).json({ error: 'Missing API key' })

  const body = {
    model,
    messages: buildMessages(prompt),
    stream: false,
  }
  if (req.body?.maxTokens) body.max_tokens = clampMaxTokens(req.body.maxTokens)

  try {
    const upstream = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'X-Title': 'AI Workflow Builder',
      },
      body: JSON.stringify(body),
    })

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: await readErrorMessage(upstream, 'openrouter'),
      })
    }

    const data = await upstream.json()
    res.json({ text: data.choices?.[0]?.message?.content ?? '' })
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : 'network'
    logSecurityEvent('warn', 'upstream_request_failed', req, { provider: 'openrouter', reason })
    res.status(502).json({ error: sanitizeNetworkError('openrouter', reason), requestId: req.requestId })
  }
})

/* ─── Ollama ─────────────────────────────────────────────────────────────────── */

app.post('/api/ollama', async (req, res) => {
  if (!enforceRateLimit(req, res, 'generate', RATE_LIMIT_OLLAMA)) return

  const payload = validateGenerationRequest(req, res)
  if (!payload) return

  const { model, prompt } = payload
  const { ollamaUrl } = req.body
  const base = validateOllamaUrl(ollamaUrl)
  if (!base) return res.status(400).json({ error: 'Invalid or disallowed Ollama URL.' })

  try {
    const upstream = await fetchWithTimeout(`${base}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: buildMessages(prompt),
        stream: false,
        response_format: { type: 'json_object' },
      }),
    })

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: await readErrorMessage(upstream, 'ollama'),
      })
    }

    const data = await upstream.json()
    res.json({ text: data.choices?.[0]?.message?.content ?? '' })
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : 'network'
    logSecurityEvent('warn', 'upstream_request_failed', req, { provider: 'ollama', reason })
    res.status(502).json({ error: sanitizeNetworkError('ollama', reason), requestId: req.requestId })
  }
})

/* ─── Ollama models ──────────────────────────────────────────────────────────── */

app.get('/api/ollama/models', async (req, res) => {
  if (!enforceRateLimit(req, res, 'ollama-models', RATE_LIMIT_OLLAMA)) return

  const base = validateOllamaUrl(req.query.url)
  if (!base) return res.status(400).json({ error: 'Invalid or disallowed Ollama URL.' })

  try {
    const upstream = await fetchWithTimeout(`${base}/api/tags`)
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: await readErrorMessage(upstream, 'ollama') })
    }
    const data = await upstream.json()
    res.json({ models: (data.models ?? []).map((m) => m.name) })
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : 'network'
    logSecurityEvent('warn', 'upstream_request_failed', req, { provider: 'ollama-models', reason })
    res.status(502).json({ error: sanitizeNetworkError('ollama', reason), requestId: req.requestId })
  }
})

/* ─── Test connection ────────────────────────────────────────────────────────── */

app.post('/api/test', async (req, res) => {
  if (!enforceRateLimit(req, res, 'connection-test', RATE_LIMIT_TEST)) return

  const { provider, model, ollamaUrl } = req.body
  const apiKey = req.headers['x-api-key']

  try {
    if (provider === 'claude') {
      if (!apiKey) return res.status(400).json({ error: 'No Claude API key provided.' })
      const upstream = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      })
      if (!upstream.ok) {
        return res.status(upstream.status).json({
          error: await readErrorMessage(upstream, 'claude'),
        })
      }
      return res.json({ message: 'Claude API connected successfully.' })
    }

    if (provider === 'openai') {
      if (!apiKey) return res.status(400).json({ error: 'No OpenAI API key provided.' })
      const upstream = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 12,
          messages: [{ role: 'user', content: 'Reply with OK.' }],
          stream: false,
        }),
      })
      if (!upstream.ok) {
        return res.status(upstream.status).json({
          error: await readErrorMessage(upstream, 'openai'),
        })
      }
      return res.json({ message: 'OpenAI API connected successfully.' })
    }

    if (provider === 'gemini') {
      if (!apiKey) return res.status(400).json({ error: 'No Gemini API key provided.' })
      const upstream = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Reply with OK.' }] }],
            generationConfig: { responseMimeType: 'text/plain' },
          }),
        },
      )
      if (!upstream.ok) {
        return res.status(upstream.status).json({
          error: await readErrorMessage(upstream, 'gemini'),
        })
      }
      return res.json({ message: 'Gemini API connected successfully.' })
    }

    if (provider === 'openrouter') {
      if (!apiKey) return res.status(400).json({ error: 'No OpenRouter API key provided.' })
      const upstream = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
          'X-Title': 'AI Workflow Builder',
        },
        body: JSON.stringify({
          model,
          max_tokens: 12,
          messages: [{ role: 'user', content: 'Reply with OK.' }],
          stream: false,
        }),
      })
      if (!upstream.ok) {
        return res.status(upstream.status).json({
          error: await readErrorMessage(upstream, 'openrouter'),
        })
      }
      return res.json({ message: 'OpenRouter API connected successfully.' })
    }

    if (provider === 'ollama') {
      const base = validateOllamaUrl(ollamaUrl)
      if (!base) return res.status(400).json({ error: 'Invalid or disallowed Ollama URL.' })
      const upstream = await fetchWithTimeout(`${base}/api/tags`)
      if (!upstream.ok) {
        return res.status(upstream.status).json({ error: await readErrorMessage(upstream, 'ollama') })
      }
      const data = await upstream.json()
      const models = (data.models ?? []).map((m) => m.name)
      if (!models.length) {
        return res.json({ message: 'Ollama is running but no models are installed.' })
      }
      return res.json({
        message: `Ollama connected. ${models.length} model${models.length !== 1 ? 's' : ''} available.`,
      })
    }

    res.status(400).json({ error: 'Unknown provider.' })
  } catch (err) {
    const providerName = provider === 'ollama' ? 'ollama' : provider || 'provider'
    const reason = err?.name === 'AbortError' ? 'timeout' : 'network'
    logSecurityEvent('warn', 'provider_test_failed', req, { provider: providerName, reason })
    res.status(502).json({ error: sanitizeNetworkError(providerName, reason), requestId: req.requestId })
  }
})

/* ─── Serve frontend in production ──────────────────────────────────────────── */

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'dist')))
  app.get('*', (_req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')))
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
