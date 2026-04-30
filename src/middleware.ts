import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/create", "/course"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the session server-side — never trust getSession() alone
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  const isProtected = PROTECTED.some((p) => path.startsWith(p));

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Bounce already-authed users away from login/signup
  if ((path === "/login" || path === "/signup") && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  // Skip static assets and API routes (API routes handle their own auth)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
