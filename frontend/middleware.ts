import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/admin/login') return NextResponse.next();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const cookieHeader = request.headers.get('cookie') || '';
  if (apiUrl && cookieHeader) {
    try {
      const response = await fetch(`${apiUrl}/api/admin/session`, {
        headers: { cookie: cookieHeader },
        cache: 'no-store',
      });
      if (response.ok) return NextResponse.next();
    } catch {
      // Fail closed when the API cannot validate the session.
    }
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/admin/login';
  loginUrl.search = '';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*'],
};