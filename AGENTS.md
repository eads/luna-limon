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

## i18n Notes (Important)
- Source of truth: Airtable table `texto` with fields: `namespace` (e.g., `carrito`, `calendario`), `clave` (flat slug with dots, e.g., `checkout.place_order`), and `texto_es` / `texto_en`.
- Messages on disk (for dev): nested JSON under a single top-level namespace; dots in `clave` become nested paths. Example:
  - `{ "carrito": { "checkout": { "place_order": "…", "placeholder": { "name": "…" } } } }`
- Runtime loader (packages/web/src/routes/+layout.server.ts):
  - Reads `packages/web/messages/{locale}.json` (via `process.cwd()/messages`) and recursively flattens nested namespace trees into dotted keys (e.g., `carrito.checkout.place_order`).
  - Overlays Airtable rows on top (authoritative when present) by composing `${namespace}.${clave}`.
- VS Code Inlang extension: auto-formats messages to nested objects. Keep it enabled; the scripts and loader intentionally support nested-in-files while Airtable stays flat.
- Dev workflow commands (run in `packages/web`):
  - `pnpm texto:sync` → Airtable → messages: nests by namespace, splits `clave` by dots, trims newlines.
  - `pnpm texto:seed` → messages → Airtable: flattens nested leaves into `(namespace, clave)` rows, trims newlines.
- Placeholders used on checkout live under `carrito.checkout.placeholder.*` and are included in seed/sync.

## Layout Notes
- Global utilities in `packages/web/src/app.css`:
  - `.l-wrap` (grid wrapper: full/content columns), `.u-full-bleed` (span full grid), `.u-content-wrap` (max-width + padding).
- Calendario/pagar use `.u-full-bleed` for full-width sections; this avoids 100vw scrollbar overflow issues and keeps pages consistent.
- Pagar summary row: flex layout with proportional image container (aspect-ratio box) and right-aligned quantity controls; item title sits above controls, wraps to multiple lines.

## Gotchas
- If messages “revert” on save: it’s the Inlang extension normalizing to nested objects. This is expected with our setup.
- The runtime loader reads from `messages/` relative to the web package working dir; keep locale files at `packages/web/messages/{en,es}.json`.
- When adding new strings during dev, prefer editing messages JSON, then run `pnpm -F web texto:seed` to push to Airtable.
