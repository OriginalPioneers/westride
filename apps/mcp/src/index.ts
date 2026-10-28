import { app } from "./app";

export default {
  port: Number(process.env.PORT ?? 3002),
  fetch: app.fetch,
};
