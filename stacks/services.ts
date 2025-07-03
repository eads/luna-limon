// stacks/services.ts      (no imports!)
export function Services() {
  // Same component code as before
  const resizer = new sst.aws.Function("ImageResizer", {
    handler: "packages/services/image-resizer.handler",
    url: true,
    runtime: "nodejs20.x",
    memory: "1024 MB",
    nodejs: { install: ['sharp'] },
  });

  // Expose for other stacks
  return { resizer };
}
