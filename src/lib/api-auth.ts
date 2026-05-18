import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/** Rutas sensibles (IA, generación, escritura) cuando INTERNAL_API_SECRET está definido. */
export const PROTECTED_API_PREFIXES = [
  '/api/agents',
  '/api/bowtie',
  '/api/generate',
  '/api/generate-docx',
  '/api/analyze',
] as const;

function isLocalHost(host: string | null): boolean {
  if (!host) return false;
  const name = host.split(':')[0]?.toLowerCase();
  return name === 'localhost' || name === '127.0.0.1' || name === '[::1]';
}

/** Permite la UI del mismo despliegue sin exponer la clave al navegador. */
export function isSameOriginBrowserRequest(request: NextRequest): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site === 'same-origin') return true;

  const host = request.headers.get('host');
  const origin = request.headers.get('origin');
  if (host && origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      /* ignore */
    }
  }

  const referer = request.headers.get('referer');
  if (host && referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      /* ignore */
    }
  }

  return isLocalHost(host);
}

/** null = acceso permitido; NextResponse = denegado. */
export function apiAccessDeniedResponse(request: NextRequest): NextResponse | null {
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  if (!secret) return null;

  const key = request.headers.get('x-pulso-api-key');
  if (key === secret) return null;

  if (isSameOriginBrowserRequest(request)) return null;

  return NextResponse.json(
    { success: false, error: 'No autorizado. Configure x-pulso-api-key o acceda desde la aplicación.' },
    { status: 401 }
  );
}

export function isProtectedApiPath(pathname: string, method: string): boolean {
  if (PROTECTED_API_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (pathname === '/api/documents' && method === 'PUT') return true;
  return false;
}
