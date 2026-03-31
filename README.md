# AI Prompt & Workflow Builder

A web app for consultants and small business owners that turns a business goal into a complete AI-powered automation workflow — recommended tools, starter prompts, and a step-by-step implementation guide.

## What it does

1. **Choose your business type** — E-Commerce, Professional Services, Healthcare, Real Estate, Restaurant, Creative Agency, Education, or Local Retail
2. **Pick a goal** — e.g. Abandoned Cart Recovery, Lead Qualification, Client Onboarding
3. **Get a generated workflow** — including:
   - Visual workflow diagram with step types (Trigger → AI → Action)
   - Recommended tools (Zapier, n8n, Claude, HubSpot, etc.) with cost info
   - Ready-to-use starter prompts with variable placeholders
   - Numbered implementation guide with time estimates and pro tips
4. **Save, copy, or export** — workflows persist in localStorage, copy all to clipboard, or download as JSON

## AI providers

Supports multiple providers, switchable in Settings:

| Provider | Setup |
|---|---|
| **Claude API** | Add your key from [console.anthropic.com](https://console.anthropic.com). Stored in browser session only. |
| **OpenAI API** | Add your key from [platform.openai.com](https://platform.openai.com/). Stored in browser session only. |
| **Gemini API** | Add your key from [Google AI Studio](https://aistudio.google.com/). Stored in browser session only. |
| **OpenRouter API** | Add your key from [openrouter.ai](https://openrouter.ai/). Stored in browser session only. |
| **Local model (Ollama)** | Install [Ollama](https://ollama.com), pull a model, click Detect |

```bash
# Install a model for Ollama
ollama pull gemma3:4b
```

## Getting started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Optional Google sign-in gate

To prevent anonymous public use of the `/api/*` proxy while full multi-user auth is still under construction, you can require Google sign-in:

```bash
GOOGLE_CLIENT_ID=your-google-oauth-client-id
APP_SESSION_SECRET=replace-with-a-long-random-secret
APP_SESSION_TTL_HOURS=12
GOOGLE_ALLOWED_EMAILS=you@example.com,teammate@example.com
# or
GOOGLE_ALLOWED_DOMAINS=example.com
```

When `GOOGLE_CLIENT_ID` is set, the app shows a Google sign-in screen and the Express API requires a valid signed session cookie. `GOOGLE_ALLOWED_EMAILS` and `GOOGLE_ALLOWED_DOMAINS` are optional allowlists for restricting who can sign in.

## Abuse controls

The Express proxy now includes:

- per-IP rate limits for generation, provider connection tests, and Ollama model discovery
- outbound provider timeouts with request IDs
- prompt-size caps plus screening for common prompt-injection phrases
- blocking for obvious secrets and regulated-data patterns before content is sent to a model
- strict workflow schema validation before AI output is rendered in the UI

Optional environment variables:

```bash
TRUST_PROXY=loopback
REQUEST_TIMEOUT_MS=25000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_GENERATE=20
RATE_LIMIT_TEST=8
RATE_LIMIT_OLLAMA=12
MAX_PROMPT_CHARS=10000
MAX_RESPONSE_TOKENS=4096
```

`TRUST_PROXY` controls whether Express should trust reverse-proxy forwarding headers when deriving the client IP used for rate limiting and request logs. Leave it unset if the app is directly exposed. Set it deliberately when the app sits behind your own proxy, for example:

- `TRUST_PROXY=loopback` when the reverse proxy runs on the same host
- `TRUST_PROXY=1` for a single trusted proxy hop
- `TRUST_PROXY=192.168.1.10` or a trusted subnet if you want to pin it more tightly

## Stack

- **React 18** + **Vite**
- **Tailwind CSS** with custom design tokens
- **No backend** — all state in localStorage
- Fonts: Cormorant Garamond, Barlow Condensed, Lato, JetBrains Mono

## Project structure

```
src/
  lib/
    businessData.js   # Business types and goals data
    aiProviders.js    # Claude API + Ollama abstraction
    prompts.js        # Structured prompt template
    storage.js        # localStorage helpers + export utils
  components/
    Header.jsx
    StepIndicator.jsx
    BusinessTypeStep.jsx
    GoalStep.jsx
    WorkflowOutput.jsx
    SettingsModal.jsx
    SavedWorkflows.jsx
  App.jsx
```

## Roadmap

- [ ] PDF export
- [ ] "Compare Zapier vs n8n" mode
- [ ] Multi-client persistence with auth
- [ ] Streaming output with live reveal
