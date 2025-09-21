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
    },
    domain: `${$app.stage}.lunalimon.co.com`,
  });
}
