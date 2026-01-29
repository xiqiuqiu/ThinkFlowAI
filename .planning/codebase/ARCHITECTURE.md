# Architecture

**Analysis Date:** 2026-01-29

## Pattern Overview

**Overall:** Vue 3 SPA with composable-driven state management and a canvas-first UI (Vue Flow).

**Key Characteristics:**
- App shell composes UI and delegates business logic to composables (`src/App.vue`).
- Centralized business state in composables, especially `src/composables/useThinkFlow.ts`.
- External services abstracted via small modules (`src/services/config.ts`, `src/lib/supabase.ts`).

## Layers

**Bootstrap/Entry:**
- Purpose: Create Vue app instance and mount the root component.
- Location: `src/main.ts`
- Contains: Vue app creation, global plugin registration.
- Depends on: `src/App.vue`, `src/i18n/index.ts`, `src/style.css`.
- Used by: `index.html` script tag.

**App Shell (Composition Root):**
- Purpose: Compose UI layout, wire composables to components, route events.
- Location: `src/App.vue`
- Contains: `VueFlow` canvas setup, global UI, modal composition, watchers for auth/project state.
- Depends on: `src/composables/useThinkFlow.ts`, `src/composables/useAuth.ts`, `src/composables/useProjects.ts`, `src/composables/useCloudStorage.ts`, `src/components/*.vue`.
- Used by: `src/main.ts`.

**UI Components:**
- Purpose: Presentational and interaction components for UI and node rendering.
- Location: `src/components/`
- Contains: Navigation (`src/components/TopNav.vue`, `src/components/SideNav.vue`), input (`src/components/BottomBar.vue`), modals (`src/components/AuthModal.vue`, `src/components/SummaryModal.vue`, `src/components/ResetConfirmModal.vue`, `src/components/ImagePreviewModal.vue`, `src/components/SettingsModal.vue`), node renderers (`src/components/WindowNode.vue`, `src/components/StickyNoteNode.vue`), sidebar (`src/components/GraphChatSidebar.vue`).
- Depends on: App-provided props and composables for actions/state.
- Used by: `src/App.vue`.

**Business Logic (Composables):**
- Purpose: Own application state, side effects, and domain operations.
- Location: `src/composables/`
- Contains: Core flow state (`src/composables/useThinkFlow.ts`), auth (`src/composables/useAuth.ts`), projects (`src/composables/useProjects.ts`), cloud sync (`src/composables/useCloudStorage.ts`).
- Depends on: Vue Composition API, Supabase client (`src/lib/supabase.ts`), config (`src/services/config.ts`).
- Used by: `src/App.vue` and components consuming actions.

**Services/Config:**
- Purpose: Centralize runtime configuration and defaults.
- Location: `src/services/config.ts`
- Contains: API endpoints and model configuration, environment fallbacks.
- Depends on: `import.meta.env`.
- Used by: `src/composables/useThinkFlow.ts`.

**Integrations & Types:**
- Purpose: External service clients and shared types.
- Location: `src/lib/`
- Contains: Supabase client (`src/lib/supabase.ts`), generated types (`src/lib/database.types.ts`).
- Depends on: `@supabase/supabase-js`.
- Used by: `src/composables/useAuth.ts`, `src/composables/useProjects.ts`, `src/composables/useCloudStorage.ts`.

**Localization:**
- Purpose: Provide i18n messaging and locale persistence.
- Location: `src/i18n/index.ts`
- Contains: i18n setup, locale selection and messages.
- Depends on: `src/i18n/locales/en.json`, `src/i18n/locales/zh.json`.
- Used by: `src/main.ts`, `src/App.vue`.

**Edge Runtime (Cloudflare):**
- Purpose: SPA fallback routing for deployed assets.
- Location: `src/worker.js`
- Contains: Asset fetch + SPA fallback to `/index.html`.
- Depends on: Cloudflare Pages/Workers bindings.
- Used by: deployment runtime (via `wrangler.jsonc`).

## Data Flow

**Canvas Interaction Flow:**
1. UI action occurs in component (e.g., `src/components/WindowNode.vue`).
2. Component emits/executes App-provided handler from `src/App.vue`.
3. Handler calls composable actions from `src/composables/useThinkFlow.ts`.
4. Composable mutates Vue Flow state (`useVueFlow`) and local reactive state.
5. `VueFlow` renders updated nodes/edges via slots in `src/App.vue`.

**Auth + Cloud Sync Flow:**
1. Auth state managed by `src/composables/useAuth.ts` (Supabase session).
2. `src/App.vue` watches auth state and initializes cloud sync via `src/composables/useCloudStorage.ts`.
3. `src/composables/useThinkFlow.ts` persists nodes/edges to localStorage, then triggers debounced cloud sync via `useCloudStorage` when enabled.

**Project Switching Flow:**
1. Project selection in `src/components/ProjectSelector.vue` updates state in `src/composables/useProjects.ts`.
2. `src/App.vue` watches `currentProject` and calls `loadProjectData` in `src/composables/useThinkFlow.ts`.
3. `useThinkFlow` loads from localStorage or calls `useCloudStorage.loadFromCloud`.

**State Management:**
- Central state is managed in composables (`src/composables/useThinkFlow.ts`, `src/composables/useAuth.ts`, `src/composables/useProjects.ts`, `src/composables/useCloudStorage.ts`).
- UI state is local to components where appropriate (e.g., `src/components/TopNav.vue`).
- Vue Flow nodes/edges are the canonical canvas state (`useVueFlow` in `src/composables/useThinkFlow.ts`).

## Key Abstractions

**ThinkFlow Business Context:**
- Purpose: Single source for canvas state, API calls, persistence, and export.
- Examples: `src/composables/useThinkFlow.ts`
- Pattern: Composable exposes state refs + action functions.

**Cloud Sync Adapter:**
- Purpose: Incremental sync of nodes/edges to Supabase.
- Examples: `src/composables/useCloudStorage.ts`
- Pattern: Dirty tracking + batch upsert/delete.

**Project Repository:**
- Purpose: CRUD and selection of projects.
- Examples: `src/composables/useProjects.ts`
- Pattern: Composable with Supabase persistence + local caching.

**Auth Session Provider:**
- Purpose: Auth status and login flows.
- Examples: `src/composables/useAuth.ts`
- Pattern: Shared singleton state with Supabase auth callbacks.

## Entry Points

**HTML Shell:**
- Location: `index.html`
- Triggers: Browser load
- Responsibilities: Mounts the SPA and sets meta tags.

**App Bootstrap:**
- Location: `src/main.ts`
- Triggers: Module load from `index.html`
- Responsibilities: Creates Vue app, installs i18n, mounts `#app`.

**App Shell:**
- Location: `src/App.vue`
- Triggers: Vue app render
- Responsibilities: Compose UI, initialize auth, manage watchers, and wire Vue Flow.

**Edge Worker:**
- Location: `src/worker.js`
- Triggers: Cloudflare runtime fetch
- Responsibilities: Serve assets and SPA fallback.

## Error Handling

**Strategy:** Localized try/catch in composables with user-friendly messages.

**Patterns:**
- Convert API errors to UI strings with `getErrorMessage` in `src/composables/useThinkFlow.ts`.
- Log failures with `console.error` in `src/composables/useThinkFlow.ts`, `src/composables/useAuth.ts`, `src/composables/useProjects.ts`.

## Cross-Cutting Concerns

**Logging:** `console.log`/`console.error` used in composables for debug and error reporting (`src/composables/useThinkFlow.ts`).
**Validation:** Input checks in components and composables (e.g., `src/components/AuthModal.vue`, `src/composables/useProjects.ts`).
**Authentication:** Supabase session management in `src/composables/useAuth.ts`, consumed by `src/App.vue` and gated actions in `src/components/WindowNode.vue`.

---

*Architecture analysis: 2026-01-29*
