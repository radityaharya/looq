import { handle } from "hono/cloudflare-pages";
import { api } from "src/api";
import { app } from "src/api";

export const onRequest = handle(api);

export { app };
export default {
	port: 3000,
	fetch: api.fetch,
};
