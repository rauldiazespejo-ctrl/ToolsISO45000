import { NextRequest, NextResponse } from 'next/server';
import { runDocumentRevisePipeline } from '@/lib/agents/document-orchestrator';
import type { DocumentGenerateInput } from '@/lib/agents/document-generator';
import { buildCorpusContext } from '@/lib/document/corpus-context';
import { ALL_DOCUMENTS } from '@/lib/sst-documents';
import type { SstDocumentItem } from '@/types/sst';

export const maxDuration = 300;

function metaFromBody(body: Record<string, unknown>, docNumber: number): DocumentGenerateInput {
  const catalog = ALL_DOCUMENTS.find((d) => d.number === docNumber);
  return {
    docNumber,
    docName: String(body.docName ?? catalog?.name ?? ''),
    description: String(body.description ?? catalog?.description ?? ''),
    normRef: String(body.normRef ?? catalog?.normRef ?? ''),
    companyName: String(body.companyName),
    rut: String(body.rut),
    business: String(body.business ?? ''),
    size: String(body.size ?? 'MIPYME'),
    workerCount: Number(body.workerCount) || 0,
    sector: String(body.sector ?? ''),
  };
}

function docFromClient(d: Record<string, unknown>): SstDocumentItem {
  return {
    number: Number(d.number),
    category: String(d.category ?? ''),
    categoryName: String(d.categoryName ?? ''),
    name: String(d.name ?? ''),
    description: String(d.description ?? ''),
    responsible: String(d.responsible ?? ''),
    priority: String(d.priority ?? ''),
    normSource: String(d.normSource ?? ''),
    normRef: String(d.normRef ?? ''),
    status: d.status as SstDocumentItem['status'],
    generatedContent: d.generatedContent ? String(d.generatedContent) : undefined,
    auditChecks: d.auditChecks as Record<string, boolean> | undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.companyName || !body.rut) {
      return NextResponse.json({ success: false, error: 'Datos de empresa requeridos' }, { status: 400 });
    }

    const clientDocs: SstDocumentItem[] = Array.isArray(body.documents)
      ? body.documents.map((d: Record<string, unknown>) => docFromClient(d))
      : [];

    const docNumbers: number[] = Array.isArray(body.docNumbers)
      ? body.docNumbers.map(Number)
      : body.docNumber != null
        ? [Number(body.docNumber)]
        : [];

    if (docNumbers.length === 0) {
      return NextResponse.json({ success: false, error: 'Indique docNumber o docNumbers' }, { status: 400 });
    }

    const results: Array<{
      docNumber: number;
      success: boolean;
      content?: string;
      review?: unknown;
      pipelineLog?: unknown;
      iterations?: number;
      corpusReferenceCount?: number;
      error?: string;
    }> = [];

    for (const docNumber of docNumbers) {
      const storeDoc = clientDocs.find((d) => d.number === docNumber);
      const content = storeDoc?.generatedContent?.trim();
      if (!content) {
        results.push({
          docNumber,
          success: false,
          error: 'Sin contenido generado',
        });
        continue;
      }

      const meta = metaFromBody(body, docNumber);
      const { context, referenceCount } = buildCorpusContext(clientDocs, docNumber);

      try {
        const result = await runDocumentRevisePipeline(meta, content, context, referenceCount, {
          skipCorpusRevise: Boolean(body.skipCorpusRevise),
          skipFix: Boolean(body.skipFix),
        });
        results.push({
          docNumber,
          success: true,
          content: result.content,
          review: result.review,
          pipelineLog: result.pipelineLog,
          iterations: result.iterations,
          corpusReferenceCount: result.corpusReferenceCount,
        });
      } catch (e) {
        results.push({
          docNumber,
          success: false,
          error: e instanceof Error ? e.message : 'Error al revisar',
        });
      }
    }

    const allOk = results.every((r) => r.success);
    return NextResponse.json({
      success: allOk,
      results,
      revised: results.filter((r) => r.success).length,
      total: results.length,
    });
  } catch (error) {
    console.error('Document revise error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error en revisión de documentos previos' },
      { status: 500 }
    );
  }
}
