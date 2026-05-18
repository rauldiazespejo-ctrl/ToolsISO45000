import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { apiAccessDeniedResponse, isProtectedApiPath } from '@/lib/api-auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (!isProtectedApiPath(pathname, request.method)) {
    return NextResponse.next();
  }

  const denied = apiAccessDeniedResponse(request);
  if (denied) return denied;

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
