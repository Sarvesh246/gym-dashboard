import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt (metadata)
     * - /login (public auth page)
     * - /api/auth/* (Supabase auth callbacks)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|login|api/auth).*)',
  ],
}
