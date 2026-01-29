# Codebase Structure

**Analysis Date:** 2026-01-29

## Directory Layout

```
[project-root]/
├── public/                 # Static assets
├── src/                    # Application source
│   ├── components/         # UI components and modals
│   ├── composables/        # Business logic/state
│   ├── i18n/               # Localization setup and messages
│   ├── lib/                # External clients and generated types
│   ├── services/           # Config and API defaults
│   ├── main.ts             # App bootstrap
│   ├── App.vue             # Root app shell
│   ├── style.css           # Global styles
│   └── worker.js           # Cloudflare SPA fallback worker
├── index.html              # SPA HTML shell
├── vite.config.ts          # Vite config
├── tailwind.config.js      # Tailwind config
├── postcss.config.js       # PostCSS config
├── tsconfig.json           # TypeScript config
└── wrangler.jsonc          # Cloudflare deployment config
```

## Directory Purposes

**src/components/**
- Purpose: UI components and modal dialogs.
- Contains: Navigation, canvas nodes, modals, sidebars.
- Key files: `src/components/TopNav.vue`, `src/components/SideNav.vue`, `src/components/BottomBar.vue`, `src/components/WindowNode.vue`, `src/components/StickyNoteNode.vue`, `src/components/AuthModal.vue`.

**src/composables/**
- Purpose: Business logic, state, and side effects.
- Contains: ThinkFlow core, auth, projects, cloud sync.
- Key files: `src/composables/useThinkFlow.ts`, `src/composables/useAuth.ts`, `src/composables/useProjects.ts`, `src/composables/useCloudStorage.ts`.

**src/i18n/**
- Purpose: Localization setup and message catalog.
- Contains: i18n init and locales.
- Key files: `src/i18n/index.ts`, `src/i18n/locales/en.json`, `src/i18n/locales/zh.json`.

**src/lib/**
- Purpose: External integrations and shared types.
- Contains: Supabase client, DB types.
- Key files: `src/lib/supabase.ts`, `src/lib/database.types.ts`.

**src/services/**
- Purpose: Config and defaults for API behavior.
- Contains: API endpoints/models and environment fallbacks.
- Key files: `src/services/config.ts`.

## Key File Locations

**Entry Points:**
- `index.html`: HTML shell that mounts the Vue app.
- `src/main.ts`: Vue app bootstrap.
- `src/App.vue`: Root application composition.

**Configuration:**
- `vite.config.ts`: Vite build and alias configuration.
- `tailwind.config.js`: Tailwind setup.
- `postcss.config.js`: PostCSS config.
- `tsconfig.json`: TypeScript compiler settings.
- `wrangler.jsonc`: Cloudflare deployment config.

**Core Logic:**
- `src/composables/useThinkFlow.ts`: Central canvas state and actions.
- `src/composables/useCloudStorage.ts`: Incremental cloud sync.
- `src/composables/useProjects.ts`: Project CRUD and selection.
- `src/composables/useAuth.ts`: Authentication logic.

**Testing:**
- Not detected (no `tests/` or `*.test.*` files found in current tree).

## Naming Conventions

**Files:**
- Vue components use PascalCase (`src/components/WindowNode.vue`).
- Composables use `useXxx` naming (`src/composables/useThinkFlow.ts`).

**Directories:**
- Lowercase, purpose-based (`src/components`, `src/composables`).

## Where to Add New Code

**New Feature:**
- Primary code: `src/composables/` (state/actions) and `src/components/` (UI).
- Tests: Not applicable (testing structure not detected).

**New Component/Module:**
- Implementation: `src/components/` for UI or `src/composables/` for shared logic.

**Utilities:**
- Shared helpers: `src/services/` or `src/lib/` depending on integration vs pure config.

## Special Directories

**public/**
- Purpose: Static assets served as-is.
- Generated: No.
- Committed: Yes.

**dist/**
- Purpose: Build output.
- Generated: Yes.
- Committed: Yes (present in repository).

**.planning/**
- Purpose: GSD planning outputs.
- Generated: Yes.
- Committed: Yes.

---

*Structure analysis: 2026-01-29*
