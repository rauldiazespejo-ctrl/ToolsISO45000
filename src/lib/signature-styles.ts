/** Estilos tipográficos tipo DocuSign (script / manuscrita). */
export interface SignatureStyleOption {
  id: string;
  label: string;
  fontFamily: string;
  fontSize: number;
  letterSpacing?: number;
  fontStyle?: 'italic' | 'normal';
}

export const SIGNATURE_STYLES: SignatureStyleOption[] = [
  {
    id: 'docusign-1',
    label: 'Clásica',
    fontFamily: "'Segoe Script', 'Brush Script MT', 'Apple Chancery', cursive",
    fontSize: 34,
  },
  {
    id: 'docusign-2',
    label: 'Elegante',
    fontFamily: "'Lucida Handwriting', 'Comic Sans MS', cursive",
    fontSize: 30,
    fontStyle: 'italic',
  },
  {
    id: 'docusign-3',
    label: 'Formal',
    fontFamily: "'Palatino Linotype', 'Times New Roman', serif",
    fontSize: 28,
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  {
    id: 'docusign-4',
    label: 'Fluida',
    fontFamily: "'Bradley Hand', 'Marker Felt', 'Snell Roundhand', cursive",
    fontSize: 32,
  },
  {
    id: 'docusign-5',
    label: 'Ejecutiva',
    fontFamily: "'Georgia', 'Garamond', serif",
    fontSize: 26,
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  {
    id: 'docusign-6',
    label: 'Moderna',
    fontFamily: "'Trebuchet MS', 'Arial', sans-serif",
    fontSize: 24,
    fontStyle: 'italic',
    letterSpacing: 2,
  },
];

export function getSignatureStyle(id: string): SignatureStyleOption {
  return SIGNATURE_STYLES.find((s) => s.id === id) ?? SIGNATURE_STYLES[0]!;
}

export function deriveInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
