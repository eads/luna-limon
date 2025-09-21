# Repository Guidelines

## Project Structure & Module Organization
- Root: SST config (`sst.config.ts`), workspace settings (`pnpm-workspace.yaml`), shared tooling.
- `packages/web`: SvelteKit app (routes in `src/routes`, UI in `src/lib`, global CSS in `src/app.css`, static assets in `static/`). i18n messages in `messages/`, helper scripts in `scripts/`.
- `packages/services`: AWS Lambda handlers (e.g., `image-resizer.ts`, `cdn-invalidator.ts`, `airtable-webhook.ts`).
- `stacks/`: SST stacks (`site.ts`, `services.ts`) wiring infrastructure and environment.
- Env: copy `.env.example` to `.env` and fill Airtable/Wompi keys.

## Build, Test, and Development Commands
- Dev (full stack): `pnpm dev` → runs `sst dev` with the Web and Services stacks.
- Dev (web only): `pnpm dev:web` or `pnpm -F web dev` → Vite dev server.
- Build (web): `pnpm -F web build`; preview: `pnpm -F web preview`.
- Typecheck: `pnpm typecheck` (root TS build for stacks) and `pnpm -F web check` (Svelte + TS).
- Lint/Format: `pnpm -F web lint` and `pnpm -F web format`.
- Deploy: `pnpm deploy:staging` or `pnpm deploy` (prod). Remove: `pnpm remove`.

## Coding Style & Naming Conventions
- Language: TypeScript and Svelte.
- Formatting: Prettier (tabs, single quotes, 100 cols). Run `pnpm -F web format`.
- Linting: ESLint with Svelte/TS configs. Run `pnpm -F web lint`.
- Naming: kebab-case for files/routes (`+page.svelte`, `+page.server.ts`); PascalCase for Svelte components; camelCase for variables/functions.

## Testing Guidelines
- No formal test suite configured yet. Use `pnpm -F web check` for type and Svelte diagnostics.
- If adding tests, prefer Vitest for TS and Playwright for E2E; co-locate as `*.test.ts` near source or under `tests/`.

## Commit & Pull Request Guidelines
- Commits: Prefer Conventional Commits (e.g., `feat(calendario): ...`, `fix(layout): ...`) as seen in history.
- Scope small, descriptive changes; reference issues when applicable.
- PRs: include a concise summary, screenshots for UI, reproduction steps for fixes, and any env/stack considerations. Link related issues and note breaking changes.

## Security & Configuration Tips
- Never commit real secrets. Use `.env` locally; CI/CD should inject env vars.
- Required env vars: `AIRTABLE_TOKEN`, `AIRTABLE_BASE`, product/order table names; optional `WOMPI_PUBLIC_KEY`.
- Webhook: protect `airtable-webhook` with `WEBHOOK_SECRET` when enabled; CloudFront invalidation can use `CLOUDFRONT_DISTRIBUTION_ID`.

