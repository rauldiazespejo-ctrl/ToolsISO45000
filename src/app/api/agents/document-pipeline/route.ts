import { NextRequest, NextResponse } from 'next/server';
import { runDocumentMultiAgentPipeline } from '@/lib/agents/document-orchestrator';
import type { DocumentGenerateInput } from '@/lib/agents/document-generator';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const required: (keyof DocumentGenerateInput)[] = [
      'docNumber',
      'docName',
      'description',
      'normRef',
      'companyName',
      'rut',
      'business',
      'size',
      'workerCount',
      'sector',
    ];

    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        if (field === 'workerCount' && body[field] === 0) continue;
        return NextResponse.json(
          { success: false, error: `Campo requerido: ${field}` },
          { status: 400 }
        );
      }
    }

    const meta: DocumentGenerateInput = {
      docNumber: Number(body.docNumber),
      docName: body.docName,
      description: body.description,
      normRef: body.normRef,
      companyName: body.companyName,
      rut: body.rut,
      business: body.business,
      size: body.size,
      workerCount: Number(body.workerCount),
      sector: body.sector,
    };

    const result = await runDocumentMultiAgentPipeline(meta, {
      initialContent: body.content,
      skipFix: Boolean(body.skipFix),
    });

    return NextResponse.json({
      success: true,
      content: result.content,
      review: result.review,
      pipelineLog: result.pipelineLog,
      iterations: result.iterations,
    });
  } catch (error) {
    console.error('Document pipeline error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error en pipeline' },
      { status: 500 }
    );
  }
}
