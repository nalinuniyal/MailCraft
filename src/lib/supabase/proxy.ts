import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { publicEnv, isSupabaseConfigured } from "@/lib/env";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/auth", "/setup", "/api/health"];
const isPublic = (path: string) => path === "/" || PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

export async function updateSession(request: NextRequest, requestHeaders: Headers = new Headers(request.headers)) {
  const path = request.nextUrl.pathname;

  if (!isSupabaseConfigured()) {
    if (path.startsWith("/api/") && path !== "/api/health") {
      return NextResponse.json({ error: "Supabase is not configured on this deployment." }, { status: 503 });
    }
    if (path !== "/setup" && path !== "/api/health") return NextResponse.redirect(new URL("/setup", request.url));
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        // Forward the refreshed cookies to the render along with our headers.
        requestHeaders.set("cookie", request.cookies.toString());
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Do not run code between createServerClient and getClaims (session refresh).
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  if (!signedIn && !isPublic(path)) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  if (signedIn && (path === "/login" || path === "/signup" || path === "/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}
