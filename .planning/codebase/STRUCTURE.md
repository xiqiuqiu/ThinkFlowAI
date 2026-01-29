# Codebase Structure

**Analysis Date:** 2026-01-29

## Directory Layout

```
[project-root]/
├── src/                # Application source
│   ├── components/     # UI components (Vue SFC)
│   ├── composables/    # Business logic & shared state
│   ├── i18n/           # Localization setup and locale files
│   ├── lib/            # SDK clients and generated types
│   ├── services/       # App config and service helpers
│   ├── App.vue         # Root UI composition
│   ├── main.ts         # App bootstrap
│   ├── style.css       # Global styles and Tailwind layers
│   └── worker.js       # Cloudflare SPA fallback worker
├── index.html          # Vite HTML entry
├── package.json        # Scripts and dependencies
├── tsconfig.json       # TS compiler options
├── vite.config.ts      # Vite config and alias
├── tailwind.config.js  # Tailwind config
└── postcss.config.js   # PostCSS config
```

## Directory Purposes

**src/components/**
- Purpose: UI-only components and modals
- Contains: `TopNav.vue`, `SideNav.vue`, `WindowNode.vue`, `AuthModal.vue`, `ProjectSelector.vue`, `SummaryModal.vue`
- Key files: `src/components/WindowNode.vue` (node UI), `src/components/BottomBar.vue` (input)

**src/composables/**
- Purpose: Business logic, state management, persistence, and API interactions
- Contains: `useThinkFlow.ts`, `useCloudStorage.ts`, `useAuth.ts`, `useProjects.ts`
- Key files: `src/composables/useThinkFlow.ts` (core graph logic)

**src/services/**
- Purpose: Configuration and service utilities
- Contains: `config.ts`
- Key files: `src/services/config.ts` (AI API configuration)

**src/lib/**
- Purpose: External SDK clients and generated types
- Contains: `supabase.ts`, `database.types.ts`
- Key files: `src/lib/supabase.ts` (Supabase client)

**src/i18n/**
- Purpose: Internationalization setup and locale bundles
- Contains: `index.ts`, `locales/en.json`, `locales/zh.json`
- Key files: `src/i18n/index.ts`

## Key File Locations

**Entry Points:**
- `src/main.ts`: Creates and mounts Vue app
- `index.html`: Loads `src/main.ts` and sets meta tags

**Configuration:**
- `vite.config.ts`: Vite + alias `@` -> `src`
- `tsconfig.json`: TS strict settings
- `tailwind.config.js`: Tailwind theme
- `postcss.config.js`: CSS pipeline

**Core Logic:**
- `src/composables/useThinkFlow.ts`: Graph state, AI calls, export
- `src/composables/useCloudStorage.ts`: Supabase sync
- `src/composables/useAuth.ts`: Supabase auth
- `src/composables/useProjects.ts`: Project CRUD

**Testing:**
- Not applicable (no test files found in repository)

## Naming Conventions

**Files:**
- Vue components use PascalCase: `src/components/WindowNode.vue`
- Composables use camelCase with `useXxx`: `src/composables/useThinkFlow.ts`

**Directories:**
- Lowercase plural groups: `src/components/`, `src/composables/`, `src/services/`

## Where to Add New Code

**New Feature:**
- Primary code: `src/composables/` for state/actions, `src/components/` for UI
- Tests: Not applicable (no testing directory established)

**New Component/Module:**
- Implementation: `src/components/` (UI) or `src/composables/` (logic)

**Utilities:**
- Shared helpers: `src/services/` or `src/lib/` depending on scope

## Special Directories

**src/i18n/locales/**
- Purpose: Locale JSON bundles
- Generated: No
- Committed: Yes

**src/lib/database.types.ts**
- Purpose: Supabase schema types
- Generated: Likely (matches DB schema)
- Committed: Yes

---

*Structure analysis: 2026-01-29*
