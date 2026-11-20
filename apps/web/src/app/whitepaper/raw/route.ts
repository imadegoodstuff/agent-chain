import { readDoc } from "@/lib/docs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const lang = new URL(req.url).searchParams.get("lang") === "zh" ? "zh" : "en";
  const doc = readDoc("whitepaper", lang);
  if (!doc.present) return new Response("Not published yet.", { status: 404 });
  return new Response(doc.content, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${doc.file}"`,
    },
  });
}
