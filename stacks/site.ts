interface ServicesCtx {
  resizer?: sst.aws.Function;
}

export function Web({ resizer }: ServicesCtx = {}) {
  if (!resizer) throw new Error("Web stack expects a resizer from Services");

  new sst.aws.SvelteKit("Web", {
    path: "packages/web",
    // link: [resizer],                        // grants IAM + generates SDK types
    environment: {
      RESIZER_URL: resizer.url,             // build-time constant
      SST_STAGE: $app.stage,                // expose stage to SvelteKit SSR
      // Airtable configuration for server routes
      AIRTABLE_TOKEN: process.env.AIRTABLE_TOKEN ?? "",
      AIRTABLE_BASE: process.env.AIRTABLE_BASE ?? "",
      AIRTABLE_PRODUCTS_TABLE: process.env.AIRTABLE_PRODUCTS_TABLE ?? "Products",
      AIRTABLE_ORDERS_TABLE: process.env.AIRTABLE_ORDERS_TABLE ?? "Orders",
      AIRTABLE_PEDIDO_TABLE: process.env.AIRTABLE_PEDIDO_TABLE ?? "pedido",
      AIRTABLE_DETALLE_PEDIDO_TABLE: process.env.AIRTABLE_DETALLE_PEDIDO_TABLE ?? "detalle_pedido",
      // Analytics (exposed to browser via PUBLIC_ prefix)
      PUBLIC_GA_ID: process.env.PUBLIC_GA_ID ?? "",
      // Wompi payment keys
      WOMPI_PUBLIC_KEY: process.env.WOMPI_PUBLIC_KEY ?? "",
      WOMPI_PRIVATE_KEY: process.env.WOMPI_PRIVATE_KEY ?? "",
      WOMPI_ENV: process.env.WOMPI_ENV ?? "",
      WOMPI_REDIRECT_URL: process.env.WOMPI_REDIRECT_URL ?? "",
      WOMPI_INTEGRITY_KEY: process.env.WOMPI_INTEGRITY_KEY ?? "",
      WOMPI_EVENTS_KEY: process.env.WOMPI_EVENTS_KEY ?? "",
    },
    domain: $app.stage === "prod"
      ? { name: "lunalimon.co.com", redirects: ["www.lunalimon.co.com"] }
      : `${$app.stage}.lunalimon.co.com`,
  });
}
