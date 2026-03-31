/**
 * Copia estáticos y Prisma al bundle standalone (Electron).
 * Multiplataforma (reemplaza xcopy de Windows).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const standalone = path.join(root, '.next', 'standalone');

if (!fs.existsSync(standalone)) {
  console.error('No existe .next/standalone. Ejecuta antes: npm run build');
  process.exit(1);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn('Omitido (no existe):', src);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

copyDir(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'));
copyDir(path.join(root, 'public'), path.join(standalone, 'public'));
copyDir(path.join(root, 'prisma'), path.join(standalone, 'prisma'));

console.log('Standalone listo para empaquetar Electron.');
