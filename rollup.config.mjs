import { glob } from "glob";
import { extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { builtinModules } from "node:module";
import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import less from "rollup-plugin-less";
import json from "@rollup/plugin-json";

export default {
	input: Object.fromEntries(
		glob
			.sync(["server.ts", "src/lib/**/*.ts", "functions/**/*.ts"], {
				ignore: ["**/*.d.ts", "**/*.test.ts", "src/**", "build/**"],
			})
			.map((file) => [
				file.slice(0, file.length - extname(file).length),
				fileURLToPath(new URL(file, import.meta.url)),
			]),
	),
	output: {
		dir: "build",
		format: "esm",
		sourcemap: true,
		preserveModules: true,
		preserveModulesRoot: ".",
	},
	external(id) {
		return id.includes(`${sep}node_modules${sep}`);
	},
	plugins: [
		typescript({
			tsconfig: "./tsconfig.json",
			moduleResolution: "bundler",
			emitDeclarationOnly: true,
		}),
		resolve({ preferBuiltins: true }),
		commonjs({ ignoreDynamicRequires: true, ignore: builtinModules }),
		less({ output: "dist/styles.css" }),
		json(),
	],
};
