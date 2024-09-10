import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
import devServer from "@hono/vite-dev-server";

// https://vitejs.dev/config/
// export default defineConfig({
// 	base: "./",
// 	plugins: [
// 		svgr({
// 			svgrOptions: {
// 				exportType: "default",
// 			},
// 		}),
// 		react(),
// 		devServer({
// 			entry: "server.ts",
// 			exclude: [
// 				// We need to override this option since the default setting doesn't fit
// 				/.*\.tsx?($|\?)/,
// 				/.*\.(s?css|less)($|\?)/,
// 				/.*\.(svg|png)($|\?)/,
// 				/^\/@.+$/,
// 				/^\/favicon\.ico$/,
// 				/^\/(public|assets|static)\/.+/,
// 				/^\/node_modules\/.*/,
// 			],
// 			injectClientScript: false, // This option is buggy, disable it and inject the code manually
// 		}),
// 	],
// 	build: {
// 		minify: "terser",
// 		outDir: "./dist",
// 	},
// 	resolve: {
// 		alias: {
// 			src: path.resolve(__dirname, "./src"),
// 			"@": path.resolve(__dirname, "./src"),
// 			functions: path.resolve(__dirname, "./functions"),
// 		},
// 	},
// 	css: {
// 		preprocessorOptions: {
// 			less: {
// 				javascriptEnabled: true,
// 			},
// 		},
// 	},
// 	server: {
// 		host: true,
// 		port: 5000,
// 		proxy: process.env.PROXY_API
// 			? {
// 					"/api": {
// 						target: "http://localhost:3000",
// 						changeOrigin: true,
// 					},
// 				}
// 			: undefined,
// 	},
// 	optimizeDeps: {
// 		include: ["react", "react-dom", "react/jsx-runtime"],
// 	},
// });

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
