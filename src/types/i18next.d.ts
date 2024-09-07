import type { defaultNS } from "../i18n/config";
import type resources from "./resources";

declare module "i18next" {
	interface CustomTypeOptions {
		defaultNS: typeof defaultNS;
		resources: typeof resources;
	}
}
