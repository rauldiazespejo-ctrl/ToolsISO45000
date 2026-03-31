/** URL estable para previsualizar el logo (incluye datos subidos en Electron). */
export function resolveClientLogoUrl(clientLogoPath?: string | null): string {
  if (!clientLogoPath) return '';
  if (clientLogoPath === '/client-logo.png' || clientLogoPath.startsWith('/api/client-logo')) {
    return '/api/client-logo';
  }
  return clientLogoPath;
}
