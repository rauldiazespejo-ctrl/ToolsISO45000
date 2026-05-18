import { NextRequest, NextResponse } from 'next/server';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ImageRun,
  PageBreak,
} from 'docx';
import { decodeBowtie } from '@/lib/bowtie/encode';
import { renderBowtiePng } from '@/lib/bowtie/render-png';
import { renderBowtieMarkdown } from '@/lib/bowtie/render-markdown';
import type { BowtieModel } from '@/lib/bowtie/types';

function mdToParagraphs(md: string): Paragraph[] {
  const out: Paragraph[] = [];
  for (const line of md.split('\n')) {
    const t = line.trim();
    if (!t) {
      out.push(new Paragraph({ children: [new TextRun('')] }));
      continue;
    }
    if (t.startsWith('# ')) {
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t.slice(2))] }));
    } else if (t.startsWith('## ')) {
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t.slice(3))] }));
    } else if (t.startsWith('### ')) {
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t.slice(4))] }));
    } else if (t.startsWith('- ')) {
      out.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(t.slice(2))] }));
    } else if (t.startsWith('```')) {
      continue;
    } else {
      out.push(new Paragraph({ children: [new TextRun(t.replace(/\*\*/g, ''))] }));
    }
  }
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model: rawModel, encoded, companyName, rut, markdown } = body as {
      model?: BowtieModel;
      encoded?: string;
      companyName?: string;
      rut?: string;
      markdown?: string;
    };

    const model = rawModel ?? (encoded ? decodeBowtie(encoded) : null);
    if (!model) {
      return NextResponse.json({ success: false, error: 'Modelo Bowtie requerido' }, { status: 400 });
    }

    const png = await renderBowtiePng(model);
    const docMd = markdown ?? renderBowtieMarkdown(model);

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              heading: HeadingLevel.TITLE,
              children: [
                new TextRun({
                  text: `Análisis Bowtie — ${model.title}`,
                  bold: true,
                  size: 32,
                  color: '1E4FA1',
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `${companyName || model.metadata.companyName} · ${rut || model.metadata.rut} · ${model.code}`,
                  size: 20,
                  color: '64748B',
                }),
              ],
            }),
            new Paragraph({ children: [new TextRun('')] }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: png,
                  transformation: { width: 620, height: Math.round(620 * 0.55) },
                  type: 'png',
                }),
              ],
            }),
            new Paragraph({ children: [new PageBreak()] }),
            ...mdToParagraphs(docMd.split('```json')[0] ?? docMd),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `${model.code}_${model.title.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ0-9]/g, '_').slice(0, 40)}.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Bowtie docx error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error al generar Word' },
      { status: 500 }
    );
  }
}
