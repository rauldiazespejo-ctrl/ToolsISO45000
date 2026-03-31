import path from 'path';
import fs from 'fs';

/** Directorio donde se guarda el logo del cliente (en escritorio: userData/uploads). */
export function getUploadsDir(): string {
  if (process.env.PULSO_USER_DATA) {
    return path.join(process.env.PULSO_USER_DATA, 'uploads');
  }
  return path.join(process.cwd(), 'public');
}

export function ensureUploadsDir(): void {
  fs.mkdirSync(getUploadsDir(), { recursive: true });
}

export const CLIENT_LOGO_BASENAME = 'client-logo.png';
