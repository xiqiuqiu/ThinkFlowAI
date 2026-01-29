# External Integrations

**Analysis Date:** 2026-01-29

## APIs & External Services

**AI (Chat + Image):**
- OpenRouter (default) - Chat and image generation requests in `src/composables/useThinkFlow.ts`
  - SDK/Client: native `fetch` in `src/composables/useThinkFlow.ts`
  - Auth: `VITE_CHAT_API_KEY`, `VITE_IMAGE_API_KEY` in `src/services/config.ts` and `.env.example`
- OpenAI-compatible providers - supported via OpenAI Chat Completions format in `src/services/config.ts` and usage in `src/composables/useThinkFlow.ts`

## Data Storage

**Databases:**
- Supabase Postgres (optional) - projects/nodes/edges persistence in `src/composables/useProjects.ts` and `src/composables/useCloudStorage.ts`
  - Connection: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in `src/lib/supabase.ts`
  - Client: `@supabase/supabase-js` in `src/lib/supabase.ts`

**File Storage:**
- Local filesystem only (browser downloads) via Blob export in `src/composables/useThinkFlow.ts`

**Caching:**
- Browser `localStorage` used for app state in `src/composables/useThinkFlow.ts` and project selection in `src/components/ProjectSelector.vue`

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - email/password and OAuth in `src/composables/useAuth.ts`
  - Implementation: `supabase.auth.*` APIs in `src/composables/useAuth.ts`

## Monitoring & Observability

**Error Tracking:**
- None detected (console logging in `src/composables/useThinkFlow.ts`)

**Logs:**
- `console.log` / `console.error` in `src/composables/useThinkFlow.ts`, `src/composables/useCloudStorage.ts`

## CI/CD & Deployment

**Hosting:**
- Cloudflare Pages / Workers (Wrangler) via `npm run deploy` in `package.json` and SPA fallback in `src/worker.js`

**CI Pipeline:**
- None detected in repository files

## Environment Configuration

**Required env vars:**
- `VITE_CHAT_BASE_URL`, `VITE_CHAT_MODEL`, `VITE_CHAT_API_KEY` in `src/services/config.ts` and `.env.example`
- `VITE_IMAGE_BASE_URL`, `VITE_IMAGE_MODEL`, `VITE_IMAGE_API_KEY` in `src/services/config.ts` and `.env.example`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in `src/lib/supabase.ts` and `.env.example`

**Secrets location:**
- `.env` (local), `.env.example` template for required vars

## Webhooks & Callbacks

**Incoming:**
- Supabase OAuth redirect to `window.location.origin` in `src/composables/useAuth.ts`

**Outgoing:**
- AI request callbacks over HTTPS via `fetch` in `src/composables/useThinkFlow.ts`

---

*Integration audit: 2026-01-29*
