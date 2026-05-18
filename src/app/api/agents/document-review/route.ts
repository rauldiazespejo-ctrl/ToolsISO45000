import { NextRequest, NextResponse } from 'next/server';
import { runDocumentReviewerAgent } from '@/lib/agents/document-reviewer';
import { validateDocumentRules, rulesToDocumentReview } from '@/lib/document/validate-rules';

export const maxDuration = 180;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { docNumber, docName, normRef, companyName, rut, size, content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ success: false, error: 'Contenido vacío' }, { status: 400 });
    }

    const input = {
      docNumber: Number(docNumber),
      docName: docName || '',
      normRef: normRef || '',
      companyName: companyName || '',
      rut: rut || '',
      size: size || 'MIPYME',
      content,
    };

    const ruleReview = rulesToDocumentReview(
      validateDocumentRules(content, { companyName: input.companyName, rut: input.rut })
    );
    const aiReview = await runDocumentReviewerAgent(input);
    const findings = [...ruleReview.findings, ...aiReview.findings];
    const blocking = findings.filter((f) => f.severity === 'bloqueante');
    const score = Math.round((ruleReview.score + aiReview.score) / 2);

    const review = {
      approved: blocking.length === 0 && score >= 78 && aiReview.approved,
      score,
      findings,
      summary: `Reglas: ${ruleReview.summary} | IA: ${aiReview.summary}`,
      suggestedPatches: aiReview.suggestedPatches,
    };

    return NextResponse.json({
      success: true,
      review,
      pipelineLog: [
        {
          agent: 'document-reviewer',
          label: 'Revisor SST (solo revisión)',
          status: 'done',
          message: `Score ${review.score}%`,
        },
      ],
    });
  } catch (error) {
    console.error('Document review error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error en revisor' },
      { status: 500 }
    );
  }
}
