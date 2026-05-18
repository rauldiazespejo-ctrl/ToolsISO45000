import { NextRequest, NextResponse } from 'next/server';
import { nextBowtieCode } from '@/lib/bowtie/encode';
import { renderBowtieMarkdown } from '@/lib/bowtie/render-markdown';
import { renderBowtieSvg } from '@/lib/bowtie/render-svg';
import { runBowtieGeneratorAgent } from '@/lib/agents/bowtie-generator';
import type { BowtieGenerateInput } from '@/lib/bowtie/ai-prompt';

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

    const model = await runBowtieGeneratorAgent(input);
    const markdown = renderBowtieMarkdown(model);
    const svgDiagram = renderBowtieSvg(model);

    return NextResponse.json({
      success: true,
      model,
      markdown,
      svgDiagram,
      encoded: JSON.stringify(model),
    });
  } catch (error) {
    console.error('Bowtie generate error:', error);
    const msg = error instanceof Error ? error.message : 'Error al generar Bowtie';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
