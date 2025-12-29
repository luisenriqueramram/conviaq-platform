// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// NO importar warmup aquí - edge runtime no soporta Node.js modules

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
