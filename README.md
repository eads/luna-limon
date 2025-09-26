# Luna Limón

SvelteKit storefront with Airtable-backed content/i18n, cart + checkout, and optional Wompi payments. Infrastructure is managed with SST (Lambda, API Gateway, CloudFront).

## Project layout

- Root: SST config (`sst.config.ts`), workspace (`pnpm-workspace.yaml`), shared tooling.
- `packages/web`: SvelteKit app (routes in `src/routes`, UI in `src/lib`, global CSS in `src/app.css`, static assets in `static/`). i18n messages in `messages/`, helper scripts in `scripts/`.
- `packages/services`: AWS Lambda utilities (e.g., Airtable webhook, image resizer, CDN invalidator).
- `stacks/`: SST stacks (`site.ts`, `services.ts`) wiring infrastructure and environment.

## Development

- Full stack (SST + web): `pnpm dev`
- Web only: `pnpm dev:web` or `pnpm -F web dev`
- Typecheck: `pnpm typecheck` (stacks) and `pnpm -F web check` (Svelte + TS)
- Lint/format: `pnpm -F web lint` and `pnpm -F web format`
- Build/preview web: `pnpm -F web build` then `pnpm -F web preview`

## Environment

Copy `.env.example` to your local env files and fill in Airtable/Wompi keys.

Recommended:

- Web-only dev: use `packages/web/.env`.
- Full-stack dev with SST: set env in stacks and/or root `.env` for local runners.

At minimum provide:

- `AIRTABLE_TOKEN`, `AIRTABLE_BASE`, and table names (`AIRTABLE_PRODUCTS_TABLE`, `AIRTABLE_PEDIDO_TABLE`, `AIRTABLE_DETALLE_PEDIDO_TABLE`, etc.).
- Optional payments: `WOMPI_PUBLIC_KEY` (enables Hosted Checkout), `WOMPI_PRIVATE_KEY` (server verification), `WOMPI_ENV` (defaults from key), `WOMPI_REDIRECT_URL` (override; otherwise current origin is used).

Only variables prefixed with `PUBLIC_` are exposed to the browser. Payment and Airtable keys are server-side.

## i18n workflow

- Source of truth lives in Airtable table `texto` with fields: `namespace`, `clave` (dotted path), `texto_es`, `texto_en`.
- Dev messages live at `packages/web/messages/{es,en}.json` as nested objects.
- Commands (run in `packages/web`):
  - `pnpm texto:sync` → Airtable → messages (overlays rows onto local JSON, nesting by dots).
  - `pnpm texto:seed` → messages → Airtable (flattens nested leaves into `(namespace, clave)` rows).

## Catalog and checkout

- Products load from `AIRTABLE_PRODUCTS_TABLE`.
- Cart and customer details are captured on `/pagar`.
- An order is created in Airtable (`pedido` + `detalle_pedido` rows) when the user clicks Place Order.
- If `WOMPI_PUBLIC_KEY` is set, the API returns a Wompi Hosted Checkout URL; otherwise a mock success flow is used.

### Wompi (Hosted Checkout)

- The server builds a dynamic `redirect-url` using the current request origin, so local/staging/prod work without changing config. You can override with `WOMPI_REDIRECT_URL`.
- On click, we create the order with `estado = "Iniciado"`, then redirect to Wompi with `amount-in-cents`, `currency=COP`, and a unique `reference` (`pedido-{pedidoId}`).
- After payment, Wompi redirects to `/pagar/exito?pedidoId=...&id=...`. The success page verifies the transaction with Wompi (using `WOMPI_PRIVATE_KEY`) and updates `pedido.estado` to “Pagado” or “Pago fallido”.
- Sandbox testing: use Wompi test keys (`pub_test_...`, `prv_test_...`) and the test card numbers from the Wompi dashboard/docs.

### Airtable fields for orders

In table `pedido` (orders):

- `Estado` (Single select): “Iniciado”, “Pagado”, “Pago fallido”.
- `Nombre` (Texto): Nombre del cliente.
- `Correo electrónico` (Texto): Email del cliente.
- `Número de WhatsApp` (Texto): Contacto del cliente.
- `Dirección de envío` (Texto largo): Dirección completa.
- `Fecha de entrega` (Fecha): YYYY-MM-DD.
- `Notas del cliente` (Texto largo): Comentarios adicionales.
- Opcional Wompi:
  - `Wompi: Transacción ID` (Texto)
  - `Wompi: Estado` (Texto)
  - `Wompi: Referencia` (Texto)
  - `Wompi: Moneda` (Texto)
  - `Wompi: Monto (centavos)` (Número)
  - `Pagado en` (Fecha/Hora)

In table `detalle_pedido` (order items):

- `Cantidad` (Número), `Precio unitario` (Número), vínculo a `Pedido`, vínculo a `Producto`.
- Opcional: `Subtotal` (fórmula `Cantidad * Precio unitario`) y un rollup en `Pedido` para totales.

## Styling

Tailwind CSS with `forms` and `typography` plugins. Global styles: `packages/web/src/app.css`.

## Deploy

- Staging: `pnpm deploy:staging`
- Production: `pnpm deploy`
- Remove: `pnpm remove`

Domains are configured in `stacks/site.ts`.

## Airtable → CDN invalidation

`AirtableWebhookFn` invalidates CloudFront and warms the cache after Airtable changes. Pages fetch live data with sensible `Cache-Control` to keep edge caches fresh.

Optional env:

- `WEBHOOK_SECRET`: Require `?secret=...` on webhook URL.
- `CLOUDFRONT_DISTRIBUTION_ID`: Explicit distribution id to skip alias lookup.
