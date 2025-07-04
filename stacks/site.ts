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
    },
    domain: `luna-limon--${$app.stage}.grupovisual.org`,
  });
}
