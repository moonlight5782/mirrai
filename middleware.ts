import { NextRequest, NextResponse } from "next/server";
import { localeCookie, normalizeLocale } from "./lib/i18n.mjs";

/** Resolve locale before SSR, including cookie-less cross-origin widget frames. */
export function middleware(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("lang");
  const locale = normalizeLocale(
    requested ?? request.cookies.get(localeCookie)?.value,
  );
  const headers = new Headers(request.headers);
  // Always overwrite this header; a caller must not inject arbitrary locale data.
  headers.set("x-mirrai-locale", locale);
  const response = NextResponse.next({ request: { headers } });
  if (requested !== null) {
    response.cookies.set(localeCookie, locale, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });
  }
  return response;
}

export const config = { matcher: ["/((?!api/|_next/|assets/|.*\\.).*)"] };
