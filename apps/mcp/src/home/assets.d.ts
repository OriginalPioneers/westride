// Written by scripts/build-home.ts before the server starts or builds.
declare module "*/dist/assets.json" {
  const assets: { version: string; js: string; css: string };
  export default assets;
}
