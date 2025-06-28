# Luna Limón

This project is a minimal SvelteKit site that uses Airtable for translations and now includes a skeleton cart/checkout flow powered by Airtable, WhatsApp and Wompi.

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Styling

This project is configured with [Tailwind CSS](https://tailwindcss.com/) using the `forms` and `typography` plugins. Global styles are loaded from `src/app.css` and Tailwind scans the `src` directory for class names.

## Environment variables

Copy `.env.example` to `.env` and fill in your Airtable and Wompi credentials:

```bash
cp .env.example .env
```

At a minimum, `AIRTABLE_TOKEN`, `AIRTABLE_BASE` and table names must be provided. `WOMPI_PUBLIC_KEY` can be left empty to disable card payments.

## Catalog and checkout

Products are loaded from the Airtable table defined in `AIRTABLE_PRODUCTS_TABLE`.
Users can add items to a cart and provide their WhatsApp number during checkout. Orders are logged to Airtable via `/api/order`. When a `WOMPI_PUBLIC_KEY` is present, the API returns a Wompi checkout URL for card payments.

## SST deployment

This project deploys using [SST](https://sst.dev/). Two stages are configured
with custom domains:

- `staging` → `lunalimon--staging.grupovisual.org`
- `production` → `lunalimon--production.grupovisual.org`

Edit `sst.config.ts` if you need to adjust these domains.

## Triggering rebuilds from Airtable

The `AirtableWebhookFn` lambda handles Airtable webhook events. Each POST
request schedules a build. The delay before starting is controlled by the
`WAIT_BEFORE_BUILD` environment variable (default `30000` milliseconds) and
repeated builds are throttled via `BUILD_DEBOUNCE` (default `300000`
milliseconds).
