import { ALL_DOCUMENTS } from '@/lib/sst-documents';
import type { SstDocumentItem } from '@/types/sst';

export interface DbDocumentRow {
  number: number;
  status?: string;
  generatedContent?: string | null;
  auditChecksJson?: string | null;
  aiReviewJson?: string | null;
}

export function mergeDocumentsFromDb(dbDocs: DbDocumentRow[]): SstDocumentItem[] {
  const map = new Map(dbDocs.map((d) => [d.number, d]));

  return ALL_DOCUMENTS.map((defaultDoc) => {
    const row = map.get(defaultDoc.number);
    let auditChecks: Record<string, boolean> | undefined;
    let aiReview: SstDocumentItem['aiReview'];

    if (row?.auditChecksJson) {
      try {
        auditChecks = JSON.parse(row.auditChecksJson) as Record<string, boolean>;
      } catch {
        auditChecks = undefined;
      }
    }
    if (row?.aiReviewJson) {
      try {
        aiReview = JSON.parse(row.aiReviewJson) as SstDocumentItem['aiReview'];
      } catch {
        aiReview = undefined;
      }
    }

    return {
      ...defaultDoc,
      status: (row?.status as SstDocumentItem['status']) || defaultDoc.status,
      generatedContent: row?.generatedContent ?? undefined,
      auditChecks,
      aiReview,
    };
  });
}
