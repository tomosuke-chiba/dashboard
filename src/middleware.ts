import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 認証機能: 一時的に無効化
 * 有効化する場合は middleware.ts.backup を参照
 */
export async function middleware(_request: NextRequest) {
  // 認証を無効化 - すべてのリクエストを通過させる
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

/*
// ===== 認証有効時のコード（バックアップ） =====
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || 'default-secret-key'
);
const COOKIE_NAME = 'clinic_auth_token';

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/_next',
  '/favicon.ico',
];

const PROTECTED_PREFIXES = ['/clinic', '/admin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const isProtectedPath = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const clinicSlug = payload.clinicSlug as string;
    const isAdmin = payload.isAdmin as boolean;

    if (pathname.startsWith('/clinic/')) {
      const pathSlug = pathname.split('/')[2];
      if (!isAdmin && pathSlug && pathSlug !== clinicSlug) {
        return NextResponse.redirect(new URL(`/clinic/${clinicSlug}`, request.url));
      }
    }

    if (pathname.startsWith('/admin') && !isAdmin) {
      return NextResponse.redirect(new URL(`/clinic/${clinicSlug}`, request.url));
    }

    return NextResponse.next();
  } catch {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}
*/
