// import * as sst from "sst";
export function Services() {
  const resizer = new sst.aws.Function("ImageResizerFn", {
    handler: "packages/services/image-resizer.handler",
    nodejs: { install: ["sharp"] },
    runtime: "nodejs20.x",
    memory: "512 MB",
    url: true            // creates a Function URL
  });

  // Tiny “facade” that surfaces only the URL (+ optional perms)
  new sst.Linkable("ImageResizer", {
    properties: { url: resizer.url },
    include: [
      sst.aws.permission({
        actions: ["lambda:InvokeFunctionUrl"],
        resources: [resizer.arn]
      })
    ]
  });

  return { resizer };
}
