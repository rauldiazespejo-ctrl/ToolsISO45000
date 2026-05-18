import sharp from 'sharp';

/** Paleta usada en Word (hex sin #, mayúsculas). */
export interface DocBrandPalette {
  primary: string;
  navy: string;
  accent: string;
  textDark: string;
  textMedium: string;
  lightGray: string;
  tableBorder: string;
  white: string;
}

export const PULSO_DEFAULT_PALETTE: DocBrandPalette = {
  primary: '00D4AA',
  navy: '1B2A4A',
  accent: '0EA5E9',
  textDark: '2D3748',
  textMedium: '4A5568',
  lightGray: 'F8FAFC',
  tableBorder: 'E2E8F0',
  white: 'FFFFFF',
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return [r, g, b]
    .map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const srgb = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * srgb[0]! + 0.7152 * srgb[1]! + 0.0722 * srgb[2]!;
}

function mixHex(a: string, b: string, weightB: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const w = Math.max(0, Math.min(1, weightB));
  return rgbToHex(
    A.r * (1 - w) + B.r * w,
    A.g * (1 - w) + B.g * w,
    A.b * (1 - w) + B.b * w
  );
}

function darken(hex: string, amount: number): string {
  return mixHex(hex, '000000', amount);
}

function lighten(hex: string, amount: number): string {
  return mixHex(hex, 'FFFFFF', amount);
}

/** Contraste mínimo ~4.5:1 con texto blanco en encabezados de tabla. */
function ensureHeaderPrimary(hex: string): string {
  const white = 'FFFFFF';
  let candidate = hex;
  let tries = 0;
  while (relativeLuminance(candidate) > 0.45 && tries < 8) {
    candidate = darken(candidate, 0.12);
    tries++;
  }
  if (contrastRatio(candidate, white) < 4.5) {
    candidate = darken(candidate, 0.2);
  }
  return candidate;
}

function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function sampleAccentColor(buf: Buffer, primary: string): Promise<string> {
  const { data, info } = await sharp(buf)
    .resize(48, 48, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buckets = new Map<string, number>();
  const step = info.channels;
  for (let i = 0; i < data.length; i += step * 2) {
    const a = info.channels === 4 ? data[i + 3]! : 255;
    if (a < 40) continue;
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const key = rgbToHex(
      Math.round(r / 32) * 32,
      Math.round(g / 32) * 32,
      Math.round(b / 32) * 32
    );
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
  const primaryRgb = hexToRgb(primary);
  for (const [hex] of sorted) {
    const { r, g, b } = hexToRgb(hex);
    const dist = Math.abs(r - primaryRgb.r) + Math.abs(g - primaryRgb.g) + Math.abs(b - primaryRgb.b);
    if (dist > 80 && relativeLuminance(hex) < 0.75) return hex;
  }
  return lighten(primary, 0.25);
}

export async function extractPaletteFromBuffer(buf: Buffer): Promise<DocBrandPalette> {
  const { dominant } = await sharp(buf).ensureAlpha().resize(96, 96, { fit: 'inside' }).stats();
  const rawPrimary = rgbToHex(dominant.r, dominant.g, dominant.b);
  const primary = ensureHeaderPrimary(rawPrimary);
  const navy =
    relativeLuminance(rawPrimary) > 0.35 ? darken(rawPrimary, 0.55) : darken(rawPrimary, 0.3);
  const accent = await sampleAccentColor(buf, primary);

  return {
    primary,
    navy,
    accent,
    textDark: PULSO_DEFAULT_PALETTE.textDark,
    textMedium: PULSO_DEFAULT_PALETTE.textMedium,
    lightGray: PULSO_DEFAULT_PALETTE.lightGray,
    tableBorder: mixHex(primary, 'E2E8F0', 0.35),
    white: 'FFFFFF',
  };
}

export function paletteToDocxColors(palette: DocBrandPalette) {
  return {
    turquoise: palette.primary,
    navy: palette.navy,
    white: palette.white,
    textDark: palette.textDark,
    textMedium: palette.textMedium,
    lightGray: palette.lightGray,
    tableBorder: palette.tableBorder,
    accent: palette.accent,
  };
}

export function parseBrandPaletteJson(raw?: string | null): DocBrandPalette | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as DocBrandPalette;
    if (p?.primary && p?.navy) return p;
  } catch {
    /* ignore */
  }
  return null;
}

export function decodeLogoDataUrl(dataUrl?: string | null): Buffer | null {
  if (!dataUrl?.startsWith('data:image')) return null;
  const comma = dataUrl.indexOf(',');
  if (comma === -1) return null;
  return Buffer.from(dataUrl.slice(comma + 1), 'base64');
}
