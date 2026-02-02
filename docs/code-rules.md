# OmniMind Code Rules (ShopFront)

## Project: ShopFront

- Purpose: OmniMind (OmniMind) is a Vue 3 + TypeScript app for AI-powered mind mapping and idea expansion with local-first storage and optional Supabase sync.
- Tech stack: Vue 3, TypeScript, Vite, Vue Flow, Tailwind CSS, Supabase, Vue I18n, Axios.
- Deployment: Cloudflare Pages via Wrangler (build + deploy).

## Code Style

- Vue: use `<script setup lang="ts">` in all components; Composition API with `ref`, `reactive`, `computed`, `watch`.
- TypeScript: `strict` enabled; always type props, refs, and function parameters.
- Imports: order as Vue core, third-party, then internal (`@` alias).
- Naming:
  - Components: PascalCase (e.g. `WindowNode.vue`).
  - Composables: `useXxx` camelCase (e.g. `useThinkFlow.ts`).
  - Functions/variables: camelCase; constants: UPPER_SNAKE_CASE.
- Error handling: use try/catch for async; log with context `console.error('[Component] message', error)` and show user feedback on critical errors.
- State: keep UI state local; centralize business logic in composables; use `computed` for derived state.
- Styling: Tailwind first; scoped CSS only for complex animations or Vue Flow overrides; keep color scheme consistent (slate + orange accent).

## Commands

- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`
- Deploy: `npm run deploy` (Cloudflare Pages via Wrangler)

## Architecture

- Entry: `src/main.ts` creates app and mounts `App.vue`.
- Core UI: `src/App.vue` orchestrates layout and wires composables to components.
- Components: `src/components/` for UI blocks (TopNav, BottomBar, nodes, modals, etc.).
- Composables: `src/composables/` for business logic and state (think flow, auth, projects, cloud sync).
- Services/Lib: `src/services/` for configuration; `src/lib/` for Supabase and typed schemas.
- I18n: `src/i18n/` for translations and setup.

## Important Notes

- No lint or test framework configured.
- Uses Vite alias `@` -> `src` (`tsconfig.json`).
- Vite drops `console`/`debugger` in production builds.
- Cloud sync is optional; authenticated flows use Supabase.
- Local-first storage; OpenAI-compatible API config via UI or `.env` (see README).

## API Conventions

- Follow OpenAI-compatible Chat Completions format for text generation endpoints.
- Image generation currently uses OpenRouter-compatible response format; changing providers requires updating parsing logic in `src/composables/useThinkFlow.ts`.
- Use Axios for HTTP requests; wrap async calls with try/catch and surface user-friendly errors.
- Store API credentials via `.env` variables prefixed with `VITE_` or via in-app settings; do not hardcode secrets.

## Backend & Database Conventions

- Supabase is the default backend for cloud sync and auth.
- All cloud writes should go through composables (e.g. `useCloudStorage`, `useProjects`, `useAuth`) to keep business logic centralized.
- Treat local storage as source of truth when unauthenticated; merge to cloud on login as needed.
- Keep database types in `src/lib/database.types.ts` in sync with Supabase schema.

## Commit Message Conventions

提交信息支持中文描述，但必须使用类型前缀来区分提交内容。格式：

```
<type>: <中文简短说明，描述目的/原因>
```

类型建议（任选其一，保持一致）：

- feat: 新功能/新需求
- change: 功能调整/需求修改
- fix: 缺陷修复
- refactor: 重构（不改行为）
- perf: 性能优化
- style: 样式/格式调整
- docs: 文档更新
- chore: 工具/构建/依赖/配置
- test: 测试新增/调整
  示例：
- `feat: 增加项目选择器支持多项目切换`
- `change: 调整扩展提示词提升上下文一致性`
- `fix: 修复云端同步时空节点保存问题`
