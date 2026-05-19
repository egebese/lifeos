import { getSession } from "@/lib/auth/session";
import { translate, type DictKey, type Locale } from "./dict";

const LOCALE_VALID = new Set<Locale>(["en", "tr"]);

// Reads the signed-in user's saved locale from the session-bound user row.
// Falls back to "en" for anonymous pages or any unexpected value.
export async function getLocale(): Promise<Locale> {
  const sess = await getSession().catch(() => null);
  const v = sess?.user.locale as Locale | undefined;
  return v && LOCALE_VALID.has(v) ? v : "en";
}

// Bound translator — call once per server component, then `t("nav.home")`.
export function tFor(locale: Locale) {
  return (key: DictKey, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);
}
