/// <reference path="./.sst/platform/config.d.ts" />
import dotenv from 'dotenv';

export default $config({
  app() {
    return { name: "luna-limon", home: "aws" };
  },

  async run() {
    // Load stage-specific env: .env.<stage>, allow base .env then override
    dotenv.config();
    dotenv.config({ path: `.env.${$app.stage}`, override: true });
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
