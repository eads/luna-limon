/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app() {
    return { name: "luna-limon", home: "aws" };
  },

  async run() {
    // Load stage-specific env: .env.<stage>, allow base .env then override
    const dotenv = await import('dotenv');
    dotenv.config();
    dotenv.config({ path: `.env.${$app.stage}` as const, override: true });
    const target = $cli.target;          // eg. --target Web | Services

    // ---------- slow-changing services ----------
    let services: { resizer?: sst.aws.Function } = {};
    if (!target || target === "Services") {
      services = await (await import("./stacks/services.ts")).Services();
    }

    // ---------- fast-deploying frontend ----------
    if (!target || target === "Web") {
      await (await import("./stacks/site.ts")).Web(services);
    }
  }
});
