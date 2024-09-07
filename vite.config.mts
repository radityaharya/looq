import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig({
	base: "./",
	plugins: [
		svgr({
			svgrOptions: {
				exportType: "default",
			},
		}),
		react(),
	],
	build: {
		minify: true,
		outDir: "./build",
	},
	resolve: {
		alias: {
			src: path.resolve(__dirname, "./src"),
			"@": path.resolve(__dirname, "./src"),
			functions: path.resolve(__dirname, "./functions"),
		},
	},
	css: {
		preprocessorOptions: {
			less: {
				javascriptEnabled: true,
			},
		},
	},
	server: {
		host: true,
		port: 5000,
	},
});
