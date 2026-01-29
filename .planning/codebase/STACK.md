# Technology Stack

**Analysis Date:** 2026-01-29

## Languages

**Primary:**
- TypeScript - Application logic and state in `src/main.ts`, `src/composables/useThinkFlow.ts`, `src/composables/useAuth.ts`
- Vue SFC (TypeScript in `<script setup lang="ts">`) - UI components in `src/App.vue`, `src/components/WindowNode.vue`

**Secondary:**
- JavaScript - Cloudflare Worker entry in `src/worker.js`

## Runtime

**Environment:**
- Vite dev server / bundler for a browser SPA, configured in `vite.config.ts`

**Package Manager:**
- npm
- Lockfile: present (`package-lock.json`)

## Frameworks

**Core:**
- Vue 3 - UI framework used across `src/App.vue` and `src/components/*.vue`
- Vue Flow - graph/canvas rendering via `@vue-flow/core` and plugins in `src/App.vue`, `src/composables/useThinkFlow.ts`
- Vue I18n - localization in `src/i18n/index.ts` and `src/App.vue`

**Testing:**
- Vitest - test runner configured via `package.json` scripts
- @vue/test-utils + jsdom - component testing stack in `package.json`

**Build/Dev:**
- Vite - dev/build pipeline configured in `vite.config.ts`
- Tailwind CSS - styling configured in `tailwind.config.js`
- PostCSS + Autoprefixer - CSS processing in `postcss.config.js`
- Wrangler - Cloudflare deploy tooling in `package.json`

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` - auth + cloud sync client in `src/lib/supabase.ts`, used by `src/composables/useAuth.ts` and `src/composables/useCloudStorage.ts`
- `@vue-flow/core` (+ background/controls/minimap) - canvas graph engine in `src/App.vue`
- `markdown-it` - Markdown rendering in `src/composables/useThinkFlow.ts`, `src/components/WindowNode.vue`

**Infrastructure:**
- `vue-i18n` - localization provider in `src/i18n/index.ts`
- `lucide-vue-next` - icon set across `src/components/*.vue`

## Configuration

**Environment:**
- Vite env vars (`import.meta.env`) consumed in `src/services/config.ts` and `src/lib/supabase.ts`
- Example env file at `.env.example` and runtime env at `.env`

**Build:**
- `vite.config.ts`
- `tsconfig.json`
- `tailwind.config.js`
- `postcss.config.js`

## Platform Requirements

**Development:**
- Node.js + npm to run `vite` via scripts in `package.json`
- Optional env vars for AI APIs and Supabase in `.env` / `.env.example`

**Production:**
- Static hosting for `dist/` (Cloudflare Pages flow in `package.json`)
- SPA fallback Worker at `src/worker.js` for Cloudflare deployments

---

*Stack analysis: 2026-01-29*
