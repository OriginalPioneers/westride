// Written by scripts/build-explorer.ts before the server starts or builds.
declare module "*/explorer/dist/assets.json" {
  const assets: { version: string; js: string; css: string };
  export default assets;
}
