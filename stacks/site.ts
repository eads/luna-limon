/// <reference types="sst" />
export async function Web({ resizer }: { resizer: sst.aws.Function }) {
  new sst.aws.SvelteKit("Web", {
    path: "packages/web",
    environment: {
      RESIZER_URL: resizer.url,
    },
    link: [resizer],
  });
}
