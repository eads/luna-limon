/// <reference types="sst" />
export default $config({
  app() {
    return { name: "luna-limon", home: "aws" };
  },
  async run() {
    const { Services } = await import("./stacks/services.ts");
    const { Web      } = await import("./stacks/site.ts");

    const { resizer } = await Services();   // run once ⬅️
    await Web({ resizer });                 // hand it to Web()
  },
});
