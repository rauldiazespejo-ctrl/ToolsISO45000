import type { SstDocumentItem } from '@/types/sst';

/** Sincroniza un documento con PostgreSQL (no bloquea la UI si falla). */
export async function syncDocumentToServer(
  companyId: string | undefined,
  doc: Pick<SstDocumentItem, 'number' | 'status' | 'generatedContent' | 'auditChecks' | 'aiReview'>
): Promise<boolean> {
  if (!companyId) return false;
  try {
    const res = await fetch('/api/documents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId,
        number: doc.number,
        status: doc.status,
        generatedContent: doc.generatedContent ?? undefined,
        auditChecks: doc.auditChecks,
        aiReview: doc.aiReview,
      }),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch {
    return false;
  }
}

export function parseCompanyBranding(company: Record<string, unknown>) {
  let signatories = company.signatories;
  let brandPalette = company.brandPalette;
  let brandingMode = (company.brandingMode as string) || 'pulso';
  let clientLogoPath = company.clientLogoPath as string | undefined;

  if (company.signatoriesJson && typeof company.signatoriesJson === 'string') {
    try {
      signatories = JSON.parse(company.signatoriesJson);
    } catch {
      /* ignore */
    }
  }
  if (company.brandingJson && typeof company.brandingJson === 'string') {
    try {
      const b = JSON.parse(company.brandingJson);
      brandPalette = b.brandPalette ?? brandPalette;
      brandingMode = b.brandingMode ?? brandingMode;
      clientLogoPath = b.clientLogoPath ?? clientLogoPath;
    } catch {
      /* ignore */
    }
  }

  return { signatories, brandPalette, brandingMode, clientLogoPath };
}
