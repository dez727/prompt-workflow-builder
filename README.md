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

Supports two options — switchable in Settings:

| Provider | Setup |
|---|---|
| **Claude API** | Add your key from [console.anthropic.com](https://console.anthropic.com). Stored in browser only. |
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
