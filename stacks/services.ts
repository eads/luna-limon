// stacks/services.ts
import { StackContext, Function } from "sst/constructs";

export function ServicesStack({ stack }: StackContext) {
  // Image optimiser Lambda with a public Function URL
  const resizer = new Function(stack, "ImageResizer", {
    handler: 'packages/services/image-resizer.handler',
    url: true,
    memory: "1024 MB",
  });

  // Surface in Cloud Outputs for humans
  stack.addOutputs({ ResizerURL: resizer.url });

  // Expose to other stacks via `use()` (see WebStack)
  return { resizer };
}
