import { Hono } from "hono";
import assets from "../explorer/dist/assets.json";

// The explorer bundle is inlined into the server build, so the function serves
// it on any host. Vercel's Hono preset ignores serveStatic().
const scriptPath = `/docs/assets/explorer-${assets.version}.js`;
const stylePath = `/docs/assets/explorer-${assets.version}.css`;

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>WeStride API Reference</title>
    <meta name="description" content="Browse, read, and call the WeStride API." />
    <link rel="icon" href="https://westride.org/favicon.ico" />
    <link rel="stylesheet" href="${stylePath}" />
    <script type="module" src="${scriptPath}"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

const IMMUTABLE = "public, max-age=31536000, immutable";

export const explorer = new Hono();

explorer.get("/", (c) => {
  c.header("Cache-Control", "no-cache");
  return c.html(page);
});

explorer.get("/assets/:file", (c) => {
  const path = c.req.path;
  if (path === scriptPath) {
    return c.body(assets.js, 200, {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": IMMUTABLE,
    });
  }
  if (path === stylePath) {
    return c.body(assets.css, 200, {
      "Content-Type": "text/css; charset=utf-8",
      "Cache-Control": IMMUTABLE,
    });
  }
  return c.notFound();
});
