import path from "node:path";
import devServer from "@hono/vite-dev-server";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import compression from "vite-plugin-compression";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig({
	server: {
		port: 4000,
	},
	build: {
		outDir: "dist",
		rollupOptions: {
			external: [
				// Node.js built-ins
				/^node:/,

				// Server-side only Hono packages
				/@hono\/node-server/,
				/@hono\/vite-dev-server/,

				// Database packages
				/@neondatabase\/.*/,
				/drizzle-orm/,
				/drizzle-kit/,

				// AI/ML packages
				/@langchain\/.*/,
				/^langchain$/,
				/@ai-sdk\/.*/,
				/^ai$/,
				/openai/,

				// Server-side paths
				/^src\/api\/.*/,
				/^src\/lib\/server\/.*/,
				/^functions\/api\/.*/,
				/^server\.ts$/,

				// Additional server dependencies from package.json
				/^@hono\/zod-validator/,
				/^@neondatabase\/serverless/,
				/^drizzle-zod/,
				/^nanoid$/,
				/^node-html-markdown/,

				// Development/build tools
				/^@biomejs\/.*/,
				/^@cloudflare\/workers-types/,
				/^@rollup\/.*/,
				/^rollup/,
				/^typescript$/,
				/^ts-node$/,
				/^@types\/.*/,
				/^postcss/,
				/^tailwindcss/,
				/^terser$/,
				/^wrangler/,
				/^bun-types$/,
				/^drizzle-kit$/,
				/^eslint/,
				/^prettier/,
				/^stylelint/,
			],
			// output: {
			//   manualChunks: {
			//     vendor: ["react", "react-dom", "react-router-dom"],
			//   },
			//   // Optimize chunk size
			//   chunkFileNames: "assets/js/[name]-[hash].js",
			//   entryFileNames: "assets/js/[name]-[hash].js",
			//   assetFileNames: ({ name }) => {
			//     if (/\.(gif|jpe?g|png|svg)$/.test(name ?? "")) {
			//       return "assets/images/[name]-[hash][extname]";
			//     }
			//     if (/\.css$/.test(name ?? "")) {
			//       return "assets/css/[name]-[hash][extname]";
			//     }
			//     return "assets/[name]-[hash][extname]";
			//   },
			// },
		},
		minify: "terser",
		terserOptions: {
			compress: {
				drop_console: true,
				drop_debugger: true,
				pure_funcs: ["console.log"],
				passes: 2,
			},
			mangle: {
				properties: false,
			},
		},
		sourcemap: false,
		chunkSizeWarningLimit: 1000,
		target: "esnext",
		cssCodeSplit: true,
		assetsInlineLimit: 4096,
		reportCompressedSize: false,
		modulePreload: {
			polyfill: true, // Enable module preload polyfill
			resolveDependencies: (filename, deps, { hostId, hostType }) => {
				return deps;
			},
		},
	},
	resolve: {
		alias: {
			src: path.resolve(__dirname, "./src"),
			"@": path.resolve(__dirname, "./src"),
			"@client": path.resolve(__dirname, "./src/client"),
			"@api": path.resolve(__dirname, "./src/api"),
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
			entry: "src/server.ts",
			exclude: [
				/.*\.tsx?($|\?)/,
				/.*\.(s?css|less)($|\?)/,
				/.*\.(svg|png|jpg|jpeg|gif|webp)($|\?)/,
				/^\/@.+$/,
				/^\/favicon\.ico$/,
				/^\/(public|assets|static)\/.+/,
				/^\/node_modules\/.*/,
				// Additional media types
				/.*\.(woff|woff2|eot|ttf|otf)($|\?)/,
				/.*\.(mp4|webm|ogg|mp3|wav|flac|aac)($|\?)/,
				/.*\.(doc|docx|pdf|xlsx|xls|csv|txt)($|\?)/,
			],
			injectClientScript: true,
		}),
		visualizer({
			filename: "dist/stats.html",
			open: true,
			gzipSize: true,
			brotliSize: true,
			template: "treemap",
		}),
		compression({
			algorithm: "gzip",
			ext: ".br",
		}),
		checker({
			typescript: {
				tsconfigPath: "./tsconfig.json",
			},
		}),
	],
});
