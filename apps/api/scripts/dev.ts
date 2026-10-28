import { join } from "node:path";
import { buildExplorer, watchExplorer } from "./build-explorer";

await buildExplorer({ isDev: true });
const watcher = watchExplorer();

// The server imports the explorer bundle, so `bun --watch` restarts it
// whenever the watcher above writes a new one.
const server = Bun.spawn([process.execPath, "--watch", "src/index.ts"], {
  cwd: join(import.meta.dir, ".."),
  stdio: ["inherit", "inherit", "inherit"],
});

function shutdown() {
  watcher.close();
  server.kill();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

process.exit(await server.exited);
