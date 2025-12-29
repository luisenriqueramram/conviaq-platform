// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Importar warmup para que se active en producción
import '@/lib/db-warmup';

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
