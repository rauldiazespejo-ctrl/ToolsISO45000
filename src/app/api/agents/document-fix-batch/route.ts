import { NextRequest, NextResponse } from 'next/server';
import { runDocumentMultiAgentPipeline } from '@/lib/agents/document-orchestrator';
import type { DocumentGenerateInput } from '@/lib/agents/document-generator';
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
    aiReview: d.aiReview as SstDocumentItem['aiReview'],
  };
}

/** Revisor + corrector en lote (sin regenerar desde cero). */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.companyName || !body.rut) {
      return NextResponse.json({ success: false, error: 'Datos de empresa requeridos' }, { status: 400 });
    }

    const clientDocs: SstDocumentItem[] = Array.isArray(body.documents)
      ? body.documents.map((d: Record<string, unknown>) => docFromClient(d))
      : [];

    const onlyNotApproved = Boolean(body.onlyNotApproved);

    let docNumbers: number[] = Array.isArray(body.docNumbers)
      ? body.docNumbers.map(Number)
      : [];

    if (docNumbers.length === 0 && onlyNotApproved) {
      docNumbers = clientDocs
        .filter((d) => d.generatedContent?.trim() && d.aiReview && !d.aiReview.approved)
        .map((d) => d.number);
    }

    if (docNumbers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Indique docNumbers o active onlyNotApproved con documentos en store' },
        { status: 400 }
      );
    }

    const results: Array<{
      docNumber: number;
      success: boolean;
      content?: string;
      review?: unknown;
      pipelineLog?: unknown;
      iterations?: number;
      error?: string;
    }> = [];

    for (const docNumber of docNumbers) {
      const storeDoc = clientDocs.find((d) => d.number === docNumber);
      const content = storeDoc?.generatedContent?.trim();
      if (!content) {
        results.push({ docNumber, success: false, error: 'Sin contenido generado' });
        continue;
      }

      if (onlyNotApproved && storeDoc?.aiReview?.approved) {
        results.push({ docNumber, success: false, error: 'Ya aprobado por agentes' });
        continue;
      }

      const meta = metaFromBody(body, docNumber);
      try {
        const result = await runDocumentMultiAgentPipeline(meta, { initialContent: content });
        results.push({
          docNumber,
          success: true,
          content: result.content,
          review: result.review,
          pipelineLog: result.pipelineLog,
          iterations: result.iterations,
        });
      } catch (e) {
        results.push({
          docNumber,
          success: false,
          error: e instanceof Error ? e.message : 'Error al corregir',
        });
      }
    }

    const fixed = results.filter((r) => r.success).length;
    return NextResponse.json({
      success: fixed > 0,
      results,
      fixed,
      total: results.length,
    });
  } catch (error) {
    console.error('Document fix batch error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error en corrección por lote' },
      { status: 500 }
    );
  }
}
