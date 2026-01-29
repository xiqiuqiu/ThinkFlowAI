# Architecture

**Analysis Date:** 2026-01-29

## Pattern Overview

**Overall:** Vue 3 SPA with composable-driven state and component-only UI assembly.

**Key Characteristics:**
- Single-root app composition where `src/App.vue` wires UI to composable state/actions
- Business logic centralized in composables under `src/composables/`
- External services isolated in `src/services/` and `src/lib/`

## Layers

**UI Layer (Vue components):**
- Purpose: Render UI and forward events to composables
- Location: `src/components/`, `src/App.vue`
- Contains: Vue SFCs, templates, styles, UI-only handlers
- Depends on: composables and UI libs (Vue Flow, lucide)
- Used by: `src/App.vue` (root layout)

**State/Logic Layer (Composables):**
- Purpose: Manage app state, business rules, and side effects
- Location: `src/composables/`
- Contains: graph logic, persistence, cloud sync, auth, project CRUD
- Depends on: `@vue-flow/core`, `src/services/config.ts`, `src/lib/supabase.ts`
- Used by: `src/App.vue`, `src/components/AuthModal.vue`, `src/components/ProjectSelector.vue`

**Services/Clients Layer:**
- Purpose: External configuration and SDK clients
- Location: `src/services/`, `src/lib/`
- Contains: API config and Supabase client
- Depends on: environment variables
- Used by: composables in `src/composables/`

**Infrastructure (Entry + Static):**
- Purpose: App bootstrap and hosting glue
- Location: `src/main.ts`, `index.html`, `src/worker.js`
- Contains: app mount, HTML shell, Cloudflare SPA fallback
- Depends on: Vue and Vite

## Data Flow

**Graph Interaction Flow:**

1. UI event from component (e.g., `src/components/WindowNode.vue`, `src/components/BottomBar.vue`).
2. Event forwarded to `src/App.vue` props/handlers.
3. `src/App.vue` invokes composable actions from `src/composables/useThinkFlow.ts`.
4. `useThinkFlow` updates VueFlow nodes/edges and local state, triggers persistence and external requests.

**State Management:**
- Composition API state lives in composables (`src/composables/useThinkFlow.ts`, `src/composables/useAuth.ts`).
- Local storage used for persistence in `src/composables/useThinkFlow.ts`.
- Supabase sync handled in `src/composables/useCloudStorage.ts` and invoked from `src/App.vue`.

## Key Abstractions

**Graph Domain (Nodes/Edges):**
- Purpose: Unified mind-map structure
- Examples: `src/composables/useThinkFlow.ts`
- Pattern: Vue Flow state store (`useVueFlow`) with helpers for layout, expansion, and export

**Auth + Projects:**
- Purpose: Identity and project CRUD
- Examples: `src/composables/useAuth.ts`, `src/composables/useProjects.ts`
- Pattern: Shared singleton state via module-level refs

**Cloud Sync:**
- Purpose: Incremental persistence to Supabase
- Examples: `src/composables/useCloudStorage.ts`
- Pattern: Dirty tracking + batched upserts/deletes

## Entry Points

**SPA Bootstrap:**
- Location: `src/main.ts`
- Triggers: `index.html` loads `src/main.ts`
- Responsibilities: Create Vue app, install i18n, mount `#app`

**Root App Composition:**
- Location: `src/App.vue`
- Triggers: Vue app mount
- Responsibilities: Compose navigation, canvas, modals; wire composables to UI

**Cloudflare SPA Worker:**
- Location: `src/worker.js`
- Triggers: Cloudflare Pages routing
- Responsibilities: Serve static assets and SPA fallback

## Error Handling

**Strategy:** Composable-level try/catch with UI-safe error strings.

**Patterns:**
- Translate errors to user-friendly text in `src/composables/useThinkFlow.ts`.
- Log errors via `console.error` in `src/composables/useThinkFlow.ts` and `src/composables/useCloudStorage.ts`.

## Cross-Cutting Concerns

**Logging:** `console.log`/`console.error` in `src/composables/useThinkFlow.ts` and `src/composables/useCloudStorage.ts`.
**Validation:** Form validation in `src/components/AuthModal.vue` and input guards in `src/composables/useThinkFlow.ts`.
**Authentication:** Supabase auth via `src/composables/useAuth.ts`.

---

*Architecture analysis: 2026-01-29*
