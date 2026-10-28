import { Hono } from "hono";
import { html, raw } from "hono/html";
import { renderToString } from "react-dom/server";
import assets from "./dist/assets.json";
import { HomePage } from "./page";

// The hydration bundle is inlined into the server build, so the function
// serves it on any host. Vercel's Hono preset ignores serveStatic().
const scriptPath = `/assets/home-${assets.version}.js`;
const stylePath = `/assets/home-${assets.version}.css`;

const IMMUTABLE = "public, max-age=31536000, immutable";

function serverUrlFor(requestUrl: string) {
  const url = new URL("/mcp", requestUrl);
  if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    url.protocol = "https:";
  }
  return url.href;
}

export const home = new Hono();

home.get("/", (c) => {
  const serverUrl = serverUrlFor(c.req.url);
  const markup = renderToString(<HomePage serverUrl={serverUrl} />);

  c.header("Cache-Control", "no-cache");
  return c.html(html`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>WeStride MCP · Use WeStride in ChatGPT and Claude</title>
        <meta
          name="description"
          content="Connect the WeStride MCP server to ChatGPT or Claude and explore WeStride Academy from your AI assistant."
        />
        <link rel="icon" href="https://westride.org/favicon.ico" />
        <link rel="stylesheet" href="${stylePath}" />
        <script type="module" src="${scriptPath}"></script>
      </head>
      <body>
        <div id="root" data-server-url="${serverUrl}">${raw(markup)}</div>
      </body>
    </html>`);
});

home.get("/assets/:file", (c) => {
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
