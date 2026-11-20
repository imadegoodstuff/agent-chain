import { headers } from "next/headers";
import type { Lang } from "./i18n";

/** Language resolved by middleware (?lang → cookie → en). Server components only. */
export async function getLang(override?: string): Promise<Lang> {
  if (override === "zh" || override === "en") return override;
  const h = await headers();
  return h.get("x-lang") === "zh" ? "zh" : "en";
}
