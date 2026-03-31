## Security Backlog

This backlog expands [prompt-workflow-builder-security-roadmap.md](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/prompt-workflow-builder-security-roadmap.md) into execution-ready work items.

## Now

- [x] Replace the temporary shared access gate with Google sign-in for `/api/*`
  - Implemented in [server.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/server.js) and [App.jsx](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/App.jsx)
  - Purpose: stop anonymous internet use of the provider proxy and establish a real user identity before the full tenant model is built
  - Status: done

- [x] Add request rate limiting and lightweight abuse controls
  - Scope: per-IP limit, lower limit for `/api/test`, burst protection for generation routes
  - Files: [server.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/server.js)
  - Status: done

- [x] Add outbound request timeouts and request IDs
  - Scope: timeout wrapper for provider `fetch` calls, structured logs, request correlation
  - Files: [server.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/server.js)
  - Status: done

- [x] Add baseline LLM guardrails for prompt abuse and unsafe output handling
  - Scope: secret detection, prompt-injection screening, response-schema validation, operator review cues
  - Files: [server.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/server.js), [aiProviders.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/lib/aiProviders.js), [WorkflowOutput.jsx](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/components/WorkflowOutput.jsx)
  - Status: done

- [ ] Disable Ollama in public production by default
  - Scope: production flag or admin-only protection for `/api/ollama*`
  - Files: [server.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/server.js)

## Next

- [ ] Replace browser-local workflow persistence with backend storage
  - Scope: authenticated save/load/delete endpoints and tenant-owned workflow records
  - Files: [src/lib/storage.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/lib/storage.js), [src/App.jsx](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/App.jsx), [src/components/SavedWorkflows.jsx](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/components/SavedWorkflows.jsx)

- [ ] Move provider keys out of browser storage
  - Scope: server-side encrypted secret storage or tenant-scoped BYOK references
  - Files: [src/lib/storage.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/lib/storage.js), [src/components/SettingsModal.jsx](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/components/SettingsModal.jsx), [server.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/server.js)

- [ ] Introduce real user authn and tenant authz
  - Scope: identity provider, session handling, object ownership, authorization checks
  - Files: currently new infrastructure plus [server.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/server.js)

## Later

- [ ] Add safe ingestion for files, URLs, and notes
  - Scope: typed validation, size caps, MIME allowlist, SSRF controls, provider consent UX
  - Files: [src/components/GoalStep.jsx](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/components/GoalStep.jsx), [src/lib/prompts.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/lib/prompts.js), [server.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/server.js)

- [ ] Add audit logging and admin controls
  - Scope: workflow actions, settings changes, provider usage visibility, abuse response
  - Files: backend logging and admin surfaces not yet present

- [ ] Add automated security tests
  - Scope: authz, tenant isolation, rate limiting, SSRF defenses, unsafe-output guardrails
  - Files: new test suite not yet present
