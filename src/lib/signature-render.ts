import { createHash } from 'crypto';
import sharp from 'sharp';
import { getSignatureStyle, type SignatureStyleOption } from '@/lib/signature-styles';

const FRAME_BLUE = '#1E4FA1';
const INK = '#1A1A1A';

export interface RenderSignatureInput {
  fullName: string;
  initials: string;
  styleId: string;
  /** Semilla estable para ID de trazabilidad (empresa + rol). */
  auditSeed?: string;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildAuditId(seed: string): string {
  const hash = createHash('sha256').update(seed).digest('hex').slice(0, 12).toUpperCase();
  return `T45-${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}`;
}

function buildSignatureSvg(
  fullName: string,
  initials: string,
  style: SignatureStyleOption,
  auditId: string
): string {
  const name = escapeXml(fullName.trim() || 'Nombre Apellido');
  const ini = escapeXml(initials.trim() || 'NA');
  const audit = escapeXml(auditId);
  const fontStyle = style.fontStyle === 'italic' ? 'font-style="italic"' : '';
  const letterSpacing = style.letterSpacing ? `letter-spacing="${style.letterSpacing}"` : '';

  const mainW = 420;
  const mainH = 118;
  const iniW = 88;
  const totalW = mainW + iniW + 12;
  const totalH = mainH + 8;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <defs>
    <style>
      .lbl { font-family: Arial, Helvetica, sans-serif; font-size: 9px; fill: ${FRAME_BLUE}; }
      .audit { font-family: 'Courier New', monospace; font-size: 7.5px; fill: ${FRAME_BLUE}; }
    </style>
  </defs>
  <!-- Marco principal -->
  <rect x="1" y="1" width="${mainW - 2}" height="${mainH - 2}" rx="3" ry="3" fill="#FFFFFF" stroke="${FRAME_BLUE}" stroke-width="1.8"/>
  <line x1="1" y1="16" x2="${mainW - 1}" y2="16" stroke="${FRAME_BLUE}" stroke-width="0"/>
  <text x="${mainW / 2}" y="13" text-anchor="middle" class="lbl">Firmado electrónicamente por:</text>
  <text x="${mainW / 2}" y="68" text-anchor="middle" fill="${INK}" font-family="${style.fontFamily}" font-size="${style.fontSize}" ${fontStyle} ${letterSpacing}>${name}</text>
  <text x="${mainW / 2}" y="${mainH - 8}" text-anchor="middle" class="audit">${audit}</text>
  <!-- Marco iniciales -->
  <rect x="${mainW + 10}" y="1" width="${iniW - 2}" height="${mainH - 2}" rx="3" ry="3" fill="#FFFFFF" stroke="${FRAME_BLUE}" stroke-width="1.8"/>
  <text x="${mainW + 10 + iniW / 2}" y="13" text-anchor="middle" class="lbl">IN</text>
  <text x="${mainW + 10 + iniW / 2}" y="72" text-anchor="middle" fill="${INK}" font-family="${style.fontFamily}" font-size="28" ${fontStyle}>${ini}</text>
</svg>`;
}

export async function renderSignaturePng(input: RenderSignatureInput): Promise<{
  buffer: Buffer;
  auditId: string;
  dataUrl: string;
}> {
  const style = getSignatureStyle(input.styleId);
  const seed = input.auditSeed || `${input.fullName}|${input.initials}|${input.styleId}`;
  const auditId = buildAuditId(seed);
  const svg = buildSignatureSvg(input.fullName, input.initials, style, auditId);
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
  return { buffer, auditId, dataUrl };
}
