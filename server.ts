import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { readFile } from "node:fs/promises";
import { app } from "functions/api/[[route]]";
import { getEnv } from "src/lib/env";

const isProd = process.env.NODE_ENV === "production";
let html = await readFile(isProd ? "dist/index.html" : "index.html", "utf8");

if (!isProd) {
	html = html.replace(
		"<head>",
		`
    <script type="module">
import RefreshRuntime from "/@react-refresh"
RefreshRuntime.injectIntoGlobalHook(window)
window.$RefreshReg$ = () => {}
window.$RefreshSig$ = () => (type) => type
window.__vite_plugin_react_preamble_installed__ = true
</script>

    <script type="module" src="/@vite/client"></script>
    `,
	);
}

const env = getEnv();
console.log({ env: Object.keys(env) });

const hono = new Hono()
	.use("/assets/*", serveStatic({ root: isProd ? "dist/" : "./" }))
	.route("/api", app)
	.get("/*", (c) => c.html(html));

export default hono;

if (isProd) {
	serve({ ...hono, port: 4000 }, (info) => {
		console.log(`Listening on http://localhost:${info.port}`);
	});
}
