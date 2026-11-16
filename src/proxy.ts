import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";

/** Keeps the Supabase session fresh and sends signed-out visitors to login. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = publicEnv();

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const needsLogin = path === "/app" || path.startsWith("/app/") || path === "/onboarding";

  const redirectTo = (pathname: string, search?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    Object.entries(search ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c)); // keep the refreshed session
    return redirect;
  };

  if (!data.user && needsLogin) {
    return redirectTo("/login", { next: path + request.nextUrl.search });
  }
  if (data.user && (path === "/login" || path === "/signup")) {
    return redirectTo("/app");
  }
  return response;
}

export const config = {
  // Skip static files, the public demo and the public customer routes, which need no session.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|demo(?:/|$)|q/|api/public/|api/cron/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
