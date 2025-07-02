// infra/stacks/WebStack.ts
import { StackContext, SvelteKit, use } from "sst/constructs";
import { ServicesStack } from "./services";

export function WebStack({ stack }: StackContext) {
  // Pull the resizer defined in the other stack
  const { resizer } = use(ServicesStack);      // cross-stack import :contentReference[oaicite:1]{index=1}

  // Deploy the mostly-static SvelteKit site
  new SvelteKit(stack, "Web", {
    path: "packages/web",
    prerender: { entries: ["*"] },
    edge: false,                               // flip to true for Lambda@Edge
    environment: {
      PUBLIC_IMAGE_RESIZER_URL: resizer.url,   // injected at build-time & runtime
    },
    link: [resizer],                           // grants invoke permission + SDK binding
  });
}
