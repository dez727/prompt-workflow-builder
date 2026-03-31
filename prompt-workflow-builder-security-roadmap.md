## Security Implementation Roadmap

This roadmap translates the threat model in [prompt-workflow-builder-threat-model.md](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/prompt-workflow-builder-threat-model.md) into a practical build order for an internet-facing, multi-user version of `prompt-workflow-builder`.

## Executive recommendation

Do **not** ship the current architecture as a shared public app. The current repo is still structured like a local/single-user tool:

- public `/api/*` routes in [server.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/server.js) have no auth or rate limiting
- API keys are stored in the browser in [storage.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/lib/storage.js)
- saved workflows are browser-local only in [storage.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/lib/storage.js)
- custom free-text input already exists in [GoalStep.jsx](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/components/GoalStep.jsx)

The safest order is:

1. Lock down public access and identity first.
2. Design multi-user persistence and authorization second.
3. Add rich custom inputs only after storage, auth, and abuse controls exist.

## Phase 0: Architecture decisions before coding

Goal: make the core product/security decisions that determine the rest of the implementation.

### Decisions to make

- Choose the identity layer.
  - Examples: Clerk, Auth0, Supabase Auth, NextAuth/Auth.js equivalent for your stack.
- Choose where workflows, uploaded files, and future notes will live.
  - You need a real database and likely object storage.
- Choose provider-key strategy.
  - Option A: user brings their own API keys and you store them server-side in encrypted form.
  - Option B: operator-managed shared provider keys with strict quotas and tenant tracking.
  - Option C: hybrid.
- Decide whether Ollama is:
  - local-only for development, or
  - a real tenant feature with per-tenant remote endpoints.

### Recommendation

- For a shared public app, prefer:
  - authenticated users
  - server-side persistence
  - server-side secret storage for provider keys
  - Ollama disabled in public production unless you intentionally productize it

### Exit criteria

- Identity provider selected.
- Database/storage stack selected.
- Provider-key ownership model selected.
- Ollama public-production stance decided.

## Phase 1: Public internet minimum blockers

Goal: make the current Express server safe enough to expose publicly without being an unauthenticated abuse surface.

### Required work

- Add authentication middleware to every non-public API route in [server.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/server.js).
  - Protect `/api/claude`
  - Protect `/api/openai`
  - Protect `/api/gemini`
  - Protect `/api/openrouter`
  - Protect `/api/ollama`
  - Protect `/api/ollama/models`
  - Protect `/api/test`
- Add rate limiting and quotas in [server.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/server.js).
  - Per-IP baseline limit
  - Per-user limit once auth exists
  - Separate lower limits for `/api/test`
- Add request timeout / cancellation for outbound provider calls.
  - Today each route proxies directly with `fetch(...)` and no explicit timeout.
- Disable public Ollama access by default.
  - Either remove those routes in production or require a privileged/admin capability.
- Add structured request logging with request IDs.
  - Log route, user ID, tenant ID, provider, model, latency, outcome, and rate-limit hits.
- Add production security headers and deployment guardrails.
  - CSP
  - HSTS
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - Reverse-proxy/body-size rules

### Files to touch

- [server.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/server.js)
- Deployment/runtime config not yet in repo

### Exit criteria

- Anonymous internet callers cannot hit provider routes.
- The app can identify who made each API request.
- Requests are rate-limited and timed out.
- Ollama is either disabled publicly or explicitly admin-only.

## Phase 2: Multi-user foundation

Goal: move from browser-local state to a real shared application with tenant isolation.

### Required work

- Replace browser-only workflow persistence in [storage.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/lib/storage.js) with a server-side workflow API and database.
- Introduce tenant-scoped data models.
  - Users
  - Organizations / workspaces / tenants
  - Workflows
  - Uploaded assets / notes / URLs
  - Provider credentials or credential references
- Add authorization checks on every object access.
  - Load workflow
  - Save workflow
  - Delete workflow
  - Future file/URL/note access
- Add audit logging for sensitive actions.
  - Create/update/delete workflow
  - Key add/remove/update
  - File upload/delete
  - Provider usage events
- Stop storing sensitive provider keys in browser storage.
  - The current design in [storage.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/lib/storage.js) is okay for a local tool but not for a shared app.

### Recommended implementation shape

- Keep the React UI, but move:
  - saved workflows
  - provider settings metadata
  - future uploads/notes
  - tenant/account state
  into authenticated backend APIs.
- If you support BYOK, store keys encrypted server-side and reference them by tenant/user identity.

### Files likely to change

- [src/App.jsx](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/App.jsx)
- [src/lib/storage.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/lib/storage.js)
- [src/components/SavedWorkflows.jsx](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/components/SavedWorkflows.jsx)
- [src/components/SettingsModal.jsx](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/components/SettingsModal.jsx)
- [server.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/server.js)
- New backend persistence layer files not yet present in repo

### Exit criteria

- Workflows and settings are no longer browser-only.
- Every stored object has an owner/tenant.
- Every read/write path enforces authorization.
- API keys are no longer exposed via browser storage.

## Phase 3: Safe custom input expansion

Goal: support free text, files, URLs, and notes without turning the app into a prompt-injection, SSRF, or sensitive-data exfiltration trap.

### Current state

- Custom free-text goal already exists in [GoalStep.jsx](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/components/GoalStep.jsx).
- Prompt interpolation is partially hardened in [prompts.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/lib/prompts.js), but that is only the starting point.

### Required work before adding files/URLs/notes

- Separate input classes explicitly:
  - short plain-text business context
  - notes/documents
  - uploaded files
  - URLs to fetch
- Add server-side validation and normalization per type.
  - File size caps
  - MIME allowlist
  - Text extraction rules
  - URL scheme/host restrictions
- If you fetch URLs server-side, add SSRF controls.
  - deny internal IP ranges
  - deny link-local/metadata endpoints
  - follow limited redirects
  - DNS rebinding protections where possible
- Add content classification / sensitivity labeling before sending data to third-party providers.
- Add user-facing consent and visibility.
  - show which provider will receive which content
  - warn when external APIs will see uploaded content
- Add schema enforcement for the data passed into prompts.
  - typed fields
  - explicit truncation
  - source attribution
- Add “review before use” guardrails for generated outputs.
  - especially before prompts or workflow steps are copied into external automation tools

### Files likely to change

- [src/components/GoalStep.jsx](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/components/GoalStep.jsx)
- [src/lib/prompts.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/lib/prompts.js)
- [src/lib/aiProviders.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/lib/aiProviders.js)
- [server.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/server.js)
- New upload / fetch / ingestion handlers not yet present

### Exit criteria

- Every new input type has explicit validation rules.
- Remote URL ingestion cannot reach internal-only targets.
- Sensitive content handling is visible and auditable.
- Prompt construction consumes structured, normalized input only.

## Phase 4: Shared-secret and provider governance

Goal: make provider usage governable and supportable at tenant scale.

### Required work

- Decide whether each tenant can:
  - bring their own keys
  - use shared operator keys
  - choose per-provider
- Add per-tenant provider policy.
  - allowed providers
  - allowed models
  - request limits
  - monthly quotas
- Add provider usage telemetry.
  - per user
  - per tenant
  - per provider/model
- Add admin controls.
  - revoke compromised keys
  - disable risky models
  - suspend abusive tenants

### Files likely to change

- [src/components/SettingsModal.jsx](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/components/SettingsModal.jsx)
- [src/lib/aiProviders.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/lib/aiProviders.js)
- [server.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/server.js)
- New admin/config/backend files not yet present

### Exit criteria

- Provider use is attributable to a tenant/user.
- Model/provider usage can be restricted or revoked centrally.
- Abuse can be detected and contained without code redeploys.

## Phase 5: Detection, response, and operational hardening

Goal: make the public service observable and survivable under misuse.

### Required work

- Add monitoring and alerting.
  - route-level error rate
  - latency
  - provider outage patterns
  - rate-limit hits
  - abnormal tenant/provider usage
- Add audit/event review workflow.
- Add secret rotation and incident response runbooks.
- Add tests for:
  - authn/authz
  - tenant isolation
  - rate limiting
  - input validation
  - SSRF defenses if URL ingestion exists
  - dangerous output handling

### Exit criteria

- You can detect abuse quickly.
- You can revoke access/keys without code changes.
- Security-sensitive paths have automated tests.

## Recommended implementation order for this repo

### Track A: blockers before any public launch

1. Add auth middleware to [server.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/server.js).
2. Add rate limiting, request timeouts, and structured request logging in [server.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/server.js).
3. Disable or strictly gate Ollama routes in production.
4. Add deployment security headers and environment separation.

### Track B: blockers before any multi-user/shared beta

1. Replace [storage.js](/c:/Users/addez/Documents/Projects/prompt-workflow-builder/src/lib/storage.js) persistence with authenticated backend storage.
2. Move provider-key handling out of browser storage.
3. Add user/tenant/object authorization everywhere.
4. Add audit logs for workflow and settings actions.

### Track C: blockers before custom files/URLs/notes

1. Add typed ingestion pipeline and validation rules.
2. Add SSRF-safe URL fetching or avoid server-side URL fetch entirely.
3. Add content sensitivity policy and provider-consent UX.
4. Add stronger output review cues before export/copy/use.

## What I would do first, concretely

If we were executing this roadmap in code, I would start with:

1. `server.js`
   - auth middleware
   - rate limiter
   - request timeout wrapper
   - disable Ollama routes in production
   - structured logs
2. `src/lib/storage.js`
   - remove browser persistence for shared-mode workflows and provider keys
3. `src/App.jsx` and `src/components/SavedWorkflows.jsx`
   - convert load/save/delete workflow flows to backend API calls
4. `src/components/SettingsModal.jsx`
   - redesign for tenant-scoped provider settings rather than browser-held keys
5. `src/components/GoalStep.jsx` and `src/lib/prompts.js`
   - prepare for richer custom-input schemas instead of ad hoc text

## Launch gates

Do not open public internet access until:

- unauthenticated `/api/*` access is gone
- rate limits are active
- Ollama public behavior is decided and locked down

Do not launch shared multi-user usage until:

- server-side persistence exists
- authn/authz exists
- tenant isolation exists
- browser-stored provider secrets are gone

Do not add files/URLs/notes until:

- validation rules exist
- remote-fetch safety exists
- provider data-governance UX exists

## Notes

- The highest-risk issue is not a single bug in the current code. It is the gap between the current local-tool architecture and your intended public multi-user product shape.
- If you want, the next best step is for me to turn this roadmap into a concrete engineering backlog with milestones like:
  - `Security MVP`
  - `Shared Beta Readiness`
  - `Rich Input Safety`
