import { updateSession } from "@/lib/middleware";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/signup", "/onboarding", "/auth"];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  // Let public routes through first (updateSession would redirect them away)
  if (isPublic) {
    return NextResponse.next({ request });
  }

  // updateSession refreshes the session cookie and redirects if no user
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|manifest\\.json)$).*)",
  ],
};
