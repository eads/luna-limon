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

For automatic deploys from Airtable, set `CODEBUILD_PROJECT` to the AWS
CodeBuild project that runs your deploy script. The deploy timestamp is stored
in a DynamoDB table managed by SST; the table name is provided to the webhook
via the `BUILD_TABLE` environment variable.

## Catalog and checkout

Products are loaded from the Airtable table defined in `AIRTABLE_PRODUCTS_TABLE`.
Users can add items to a cart and provide their WhatsApp number during checkout. Orders are logged to Airtable via `/api/order`. When a `WOMPI_PUBLIC_KEY` is present, the API returns a Wompi checkout URL for card payments.

## SST deployment

This project deploys using [SST](https://sst.dev/). Two stages are configured
with custom domains:

- `staging` → `lunalimon--staging.grupovisual.org`
- `production` → `lunalimon--production.grupovisual.org`

Edit `sst.config.ts` if you need to adjust these domains.

## Airtable → CDN invalidation

The `AirtableWebhookFn` now switches from triggering slow rebuilds to
invalidating CloudFront and warming the cache. Pages fetch live data from
Airtable at request time and set `Cache-Control: public, s-maxage=3600, stale-while-revalidate=60`.

On each webhook:

- The function finds the CloudFront distribution (by alias `luna-limon--$STAGE.grupovisual.org` or by `CLOUDFRONT_DISTRIBUTION_ID` if set),
- Issues a `CreateInvalidation` for common paths (or `/*` as a fallback), and
- Warms `/, /es, /en` to repopulate edge caches quickly.

Env vars (optional but recommended):

- `WEBHOOK_SECRET`: Require `?secret=...` on the webhook URL.
- `CLOUDFRONT_DISTRIBUTION_ID`: Set explicitly to skip lookup-by-alias.
