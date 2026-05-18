import { NextRequest, NextResponse } from 'next/server';
import { runBowtieMultiAgentPipeline } from '@/lib/agents/bowtie-orchestrator';
import { nextBowtieCode } from '@/lib/bowtie/encode';
import type { BowtieGenerateInput } from '@/lib/bowtie/ai-prompt';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      hazard,
      topEvent,
      activity,
      area,
      criticality,
      context,
      companyName,
      rut,
      sector,
      workerCount,
      existingCodes = [],
      skipFix,
    } = body;

    if (!title?.trim() || !hazard?.trim() || !topEvent?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Título, peligro y evento central son obligatorios' },
        { status: 400 }
      );
    }
    if (!companyName || !rut) {
      return NextResponse.json(
        { success: false, error: 'Datos de empresa requeridos' },
        { status: 400 }
      );
    }

    const code = nextBowtieCode(existingCodes as string[]);
    const input: BowtieGenerateInput = {
      title: title.trim(),
      hazard: hazard.trim(),
      topEvent: topEvent.trim(),
      activity: activity?.trim(),
      area: area?.trim(),
      criticality: criticality === 'alto' ? 'alto' : 'critico',
      context: context?.trim(),
      companyName,
      rut,
      sector,
      workerCount,
      code,
    };

    const result = await runBowtieMultiAgentPipeline(input, {
      sector,
      workerCount,
      skipFix: Boolean(skipFix),
    });

    return NextResponse.json({
      success: true,
      model: result.model,
      markdown: result.markdown,
      svgDiagram: result.svgDiagram,
      review: result.review,
      pipelineLog: result.pipelineLog,
      iterations: result.iterations,
      encoded: JSON.stringify(result.model),
    });
  } catch (error) {
    console.error('Bowtie pipeline error:', error);
    const msg = error instanceof Error ? error.message : 'Error en pipeline multiagente';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
