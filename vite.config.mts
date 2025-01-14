import path from "node:path";
import devServer from "@hono/vite-dev-server";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import compression from "vite-plugin-compression";
import svgr from "vite-plugin-svgr";
import { VitePWA } from "vite-plugin-pwa";
type ChunkConfig = {
	pattern?: RegExp;
	includes: string[];
};

type ChunkMappings = {
	[key: string]: ChunkConfig;
};

const CHUNK_MAPPINGS: ChunkMappings = {
	"vendor-react": {
		includes: ["react", "react-dom", "react-router-dom"],
	},
	"vendor-ui": {
		pattern: /^@radix-ui\/react-/,
		includes: ["class-variance-authority", "tailwind-merge"],
	},
	"vendor-animation": {
		includes: ["framer-motion"],
	},
	"vendor-forms": {
		includes: ["react-hook-form", "@hookform/resolvers", "zod"],
	},
	"vendor-data": {
		includes: ["@tanstack/react-query", "sse.js"],
	},
	"vendor-i18n": {
		includes: ["i18next", "react-i18next"],
	},
	"vendor-content": {
		includes: ["react-markdown", "remark-gfm"],
	},
	"vendor-utils": {
		includes: ["clsx", "lucide-react", "next-themes", "sonner"],
	},
};

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
			output: {
				manualChunks: (id) => {
					for (const [chunkName, config] of Object.entries(CHUNK_MAPPINGS)) {
						if (
							config.pattern?.test(id) ||
							config.includes.some((dep) => id.includes(dep))
						) {
							return chunkName;
						}
					}
					return null;
				},
				chunkFileNames: "assets/js/[name]-[hash].js",
				entryFileNames: "assets/js/[name]-[hash].js",
				assetFileNames: (assetInfo) => {
					const source =
						typeof assetInfo.source === "string" ? assetInfo.source : "";
					if (/\.(gif|jpe?g|png|svg)$/.test(source)) {
						return "assets/images/[name]-[hash][extname]";
					}
					if (/\.css$/.test(source)) {
						return "assets/css/[name]-[hash][extname]";
					}
					return "assets/[name]-[hash][extname]";
				},
			},
		},
		minify: "terser",
		terserOptions: {
			compress: {
				drop_console: process.env.NODE_ENV === "production",
				drop_debugger: process.env.NODE_ENV === "production",
				pure_getters: true,
				unsafe_comps: true,
				unsafe_Function: true,
				unsafe_math: true,
				passes: 3,
			},
			mangle: {
				properties: false,
				toplevel: true,
			},
			format: {
				comments: false,
			},
		},
		sourcemap: process.env.NODE_ENV !== "production",
		chunkSizeWarningLimit: 800,
		cssCodeSplit: true,
		assetsInlineLimit: 4096,
		modulePreload: {
			polyfill: true,
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
			algorithm: "brotliCompress",
			ext: ".br",
			threshold: 512,
			deleteOriginFile: false,
			compressionOptions: { level: 11 },
		}),
		compression({
			algorithm: "gzip",
			ext: ".gz",
			threshold: 512,
			deleteOriginFile: false,
		}),
		checker({
			typescript: {
				tsconfigPath: "./tsconfig.json",
			},
		}),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: ["favicon.ico", "robots.txt", "apple-touch-icon.png"],
			manifest: {
				name: "Looq",
				short_name: "Looq",
				theme_color: "#000000",
				icons: [
					{
						src: "/favicon-32x32.png",
						sizes: "32x32",
						type: "image/png",
					},
				],
			},
			strategies: "generateSW",
			workbox: {
				globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
						handler: "CacheFirst",
						options: {
							cacheName: "google-fonts-cache",
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
							},
							cacheableResponse: {
								statuses: [0, 200],
							},
						},
					},
				],
			},
		}),
	],
});
