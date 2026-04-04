import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isLoggedIn = request.cookies.get('reearth_auth')?.value === 'true';
  const isLoginPage = request.nextUrl.pathname === '/login';

  // If trying to access login while authenticated, redirect to home
  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If not authenticated and not on login page, redirect to login
  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.gif|api).*)',
  ],
};
