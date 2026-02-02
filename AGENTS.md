# OmniMind Agent Guide

This document is for agentic coding assistants working in this repository.

## Project Overview

OmniMind (OmniMind) is a Vue 3 + TypeScript app for AI-powered mind mapping. It uses Vue Flow for the canvas, Tailwind CSS for styling, and optional Supabase sync.

## Source of Truth

- Existing agent rules: `docs/code-rules.md` (aligned and included here)
- Cursor rules: none found in `.cursor/rules/` or `.cursorrules`
- Copilot rules: none found in `.github/copilot-instructions.md`

## Commands (Build/Lint/Test)

```bash
# Install
npm install

# Dev server
npm run dev

# Production build
npm run build

# Preview build
npm run preview

# Deploy (Cloudflare Pages via Wrangler)
npm run deploy

# Run tests (Vitest, jsdom)
npm run test

# Run tests with UI
npm run test:ui
```

Testing and linting:

- No lint script configured.
- Test framework: Vitest + @vue/test-utils + jsdom.
- Single-test command:
  - `npx vitest run path/to/file.test.ts`
  - `npx vitest run -t "test name"`

## Project Structure

```
src/
├── components/          # Vue components
├── composables/         # Business logic and shared state
├── services/           # API and configuration services
├── lib/                # Supabase client + types
├── i18n/               # Internationalization
└── main.ts             # App entry point
```

## Code Style Guidelines

### Vue + TypeScript

- Use `<script setup lang="ts">` for components.
- TypeScript `strict` is enabled; always type props, refs, emits, and function params.
- Prefer Composition API: `ref`, `reactive`, `computed`, `watch`.
- Use `defineProps`/`defineEmits` with explicit types.

### Import Order

```ts
// 1) Vue core
import { ref, computed, onMounted } from "vue";

// 2) Third-party
import { useVueFlow } from "@vue-flow/core";
import { createClient } from "@supabase/supabase-js";

// 3) Internal (use @ alias)
import { DEFAULT_CONFIG } from "@/services/config";
import { useAuth } from "@/composables/useAuth";
```

### Naming

- Components: PascalCase (WindowNode.vue)
- Composables: `useXxx` camelCase (useThinkFlow.ts)
- Functions/vars: camelCase (expandIdea, activeNodeId)
- Constants: UPPER_SNAKE_CASE

### Component Structure

```vue
<script setup lang="ts">
// 1. Imports
// 2. Props & emits
// 3. State (refs, computed)
// 4. Handlers
// 5. Lifecycle
</script>

<template>
  <!-- Markup -->
</template>

<style scoped>
/* Use only when Tailwind is insufficient */
</style>
```

### Error Handling

- Wrap async calls with try/catch.
- Log with context: `console.error('[Feature] message:', error)`.
- Surface user-friendly errors for critical failures.

### State Management

- Keep UI state local when possible.
- Centralize business logic in composables.
- Use `computed` for derived values.

### Styling

- Tailwind first; scoped CSS only for complex animations or Vue Flow overrides.
- Keep color scheme consistent (slate + orange accent).
- Maintain responsive layout patterns.

### API and Data

- Use Axios for HTTP requests.
- Store credentials in `.env` with `VITE_` prefix or via UI settings; never hardcode secrets.
- Text generation uses OpenAI-compatible Chat Completions.
- Image generation uses OpenRouter-compatible responses; changing providers requires updating parsing in `src/composables/useThinkFlow.ts`.

### Supabase/Cloud Sync

- Supabase is optional and used for auth + sync.
- Route cloud writes through composables (`useAuth`, `useProjects`, `useCloudStorage`).
- Local storage is source of truth when unauthenticated.
- Keep `src/lib/database.types.ts` aligned with Supabase schema.

## Formatting

- Follow existing file style (mostly single quotes in `.ts`, double quotes in `vite.config.ts`).
- Use 2-space indentation in Vue templates/CSS when present.
- Avoid unnecessary comments; add only for non-obvious logic.

## Build/Runtime Notes

- Vite alias `@` -> `src` (see `tsconfig.json`).
- `vite.config.ts` drops `console` and `debugger` in production builds.
- Bilingual UI (English/Chinese) via `src/i18n`.

## Commit Message Conventions

提交信息允许中文，必须带类型前缀：

```
<type>: <中文简短说明，描述目的/原因>
```

Types: feat | change | fix | refactor | perf | style | docs | chore | test

## Quick Reference

- Entry: `src/main.ts`
- App shell: `src/App.vue`
- Components: `src/components`
- Composables: `src/composables`
- Services: `src/services`
- Supabase: `src/lib`
