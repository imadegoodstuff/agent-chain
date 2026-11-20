import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/spec";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ["", "/whitepaper", "/roadmap", "/genesis", "/builders", "/bridge"].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: p === "" ? "daily" : "weekly",
    priority: p === "" ? 1 : 0.7,
  }));
}
