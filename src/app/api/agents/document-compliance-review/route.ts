import { NextRequest, NextResponse } from 'next/server';
import { runDocumentComplianceReviewerAgent } from '@/lib/agents/document-compliance-reviewer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { docNumber, docName, content } = body ?? {};

    if (!docNumber || !docName || !content) {
      return NextResponse.json(
        {
          success: false,
          error: 'Faltan campos requeridos: docNumber, docName, content',
        },
        { status: 400 }
      );
    }

    const review = await runDocumentComplianceReviewerAgent({
      docNumber: Number(docNumber),
      docName: String(docName),
      content: String(content),
    });

    return NextResponse.json({
      success: true,
      review,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error interno en reviewer compliance',
      },
      { status: 500 }
    );
  }
}
