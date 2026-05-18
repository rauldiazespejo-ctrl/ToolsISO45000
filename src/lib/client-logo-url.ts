/** URL estable para previsualizar el logo (soporta base64 data URLs, rutas /api y rutas legacy). */
export function resolveClientLogoUrl(clientLogoPath?: string | null): string {
  if (!clientLogoPath) return '';
  // Base64 data URL — usar directamente (generado por /api/upload-logo)
  if (clientLogoPath.startsWith('data:')) return clientLogoPath;
  // Ruta legacy /client-logo.png o /api/client-logo
  if (clientLogoPath === '/client-logo.png' || clientLogoPath.startsWith('/api/client-logo')) {
    return '/api/client-logo';
  }
  return clientLogoPath;
}
