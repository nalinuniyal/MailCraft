import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { buildCsp, createNonce } from "@/lib/security/csp";
import { publicEnv } from "@/lib/env";

export async function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = buildCsp({ nonce, dev: process.env.NODE_ENV === "development", supabaseUrl: publicEnv.supabaseUrl || undefined });
  // Next.js reads the nonce from the request's CSP header while rendering.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = await updateSession(request, requestHeaders);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|monaco|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)"],
};
