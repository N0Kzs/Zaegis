import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // Check if accessing administration or ciras_rep routes
  if (pathname.startsWith('/dashboard/administration') || pathname.startsWith('/dashboard/ciras_rep')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const { payload } = await jwtVerify(token, SECRET);
      const role = payload.role;

      if (role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      // ✅ Role OK, continue
      return NextResponse.next();
    } catch (error) {
      console.error("JWT verification failed:", error);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/administration', 
    '/dashboard/administration/:path*',
    '/dashboard/ciras_rep',
    '/dashboard/ciras_rep/:path*'
  ],
};