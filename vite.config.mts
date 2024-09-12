import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
import devServer from "@hono/vite-dev-server";

// https://vitejs.dev/config/
export default defineConfig({
	server: {
		port: 4000, // change to a custom port
	},
	build: {
		outDir: "dist", // change to 'build', explain later
	},
	resolve: {
		alias: {
			src: path.resolve(__dirname, "./src"),
			"@": path.resolve(__dirname, "./src"),
			functions: path.resolve(__dirname, "./functions"),
		},
	},
	plugins: [
		react(),
		svgr({
			svgrOptions: {
				exportType: "default",
			},
		}),
		devServer({
			entry: "server.ts",
			exclude: [
				// We need to override this option since the default setting doesn't fit
				/.*\.tsx?($|\?)/,
				/.*\.(s?css|less)($|\?)/,
				/.*\.(svg|png)($|\?)/,
				/^\/@.+$/,
				/^\/favicon\.ico$/,
				/^\/(public|assets|static)\/.+/,
				/^\/node_modules\/.*/,
			],
			injectClientScript: false, // This option is buggy, disable it and inject the code manually
		}),
	],
});
