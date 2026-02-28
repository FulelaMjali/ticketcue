import { NextResponse } from 'next/server';
import { auth } from './lib/auth-edge';

const PROTECTED_PATHS = ['/dashboard', '/reminders', '/events', '/calendar'];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');

  // If not authenticated and requesting protected page, send to login
  if (isProtected && !req.auth) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated and requesting auth pages, send to dashboard
  if (isAuthPage && req.auth) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/reminders/:path*',
    '/events/:path*',
    '/calendar/:path*',
    '/login',
    '/register',
  ],
};
