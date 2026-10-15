import { EN as PHRASES } from "./i18n-phrases";
import { EN_EXTRA } from "./i18n-extra";

/** Loaded only after the visitor chooses English. */
export const EN: Record<string, string> = { ...PHRASES, ...EN_EXTRA };
