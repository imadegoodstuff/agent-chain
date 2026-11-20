import { NextResponse, type NextRequest } from "next/server";

/**
 * Language resolution, server-side, before render:
 *   ?lang=zh|en  >  cookie ac.lang  >  en
 * The result is passed to the app as the `x-lang` request header (read by the
 * root layout / pages), and persisted as a cookie when it came from the URL so
 * later navigations without the query keep the language.
 */
export function middleware(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("lang");
  const cookie = req.cookies.get("ac.lang")?.value;
  const lang = q === "zh" || q === "en" ? q : cookie === "zh" ? "zh" : "en";

  const headers = new Headers(req.headers);
  headers.set("x-lang", lang);
  const res = NextResponse.next({ request: { headers } });
  if ((q === "zh" || q === "en") && q !== cookie) {
    res.cookies.set("ac.lang", q, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/|api/|.*/raw$|favicon.ico|icon.svg|opengraph-image|sitemap.xml|robots.txt).*)"],
};
