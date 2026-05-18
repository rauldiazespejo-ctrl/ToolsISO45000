import { NextRequest, NextResponse } from 'next/server';
import { decodeBowtie } from '@/lib/bowtie/encode';
import { runBowtieReviewerAgent } from '@/lib/agents/bowtie-reviewer';
import { validateBowtieRules, rulesToReview } from '@/lib/bowtie/validate-rules';
import type { BowtieModel } from '@/lib/bowtie/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const model: BowtieModel | null = body.model ?? (body.encoded ? decodeBowtie(body.encoded) : null);
    if (!model) {
      return NextResponse.json({ success: false, error: 'Modelo Bowtie requerido' }, { status: 400 });
    }

    const ruleReview = rulesToReview(validateBowtieRules(model));
    const aiReview = await runBowtieReviewerAgent(model, {
      sector: body.sector,
      workerCount: body.workerCount,
    });

    const findings = [...ruleReview.findings, ...aiReview.findings];
    const blocking = findings.filter((f) => f.severity === 'bloqueante');
    const score = Math.round((ruleReview.score + aiReview.score) / 2);
    const review = {
      approved: blocking.length === 0 && score >= 75 && aiReview.approved,
      score,
      findings,
      summary: `Reglas: ${ruleReview.summary} | IA: ${aiReview.summary}`,
    };

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error('Bowtie review error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error al revisar' },
      { status: 500 }
    );
  }
}
