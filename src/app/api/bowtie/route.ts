import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decodeBowtie, encodeBowtie } from '@/lib/bowtie/encode';
import type { BowtieModel } from '@/lib/bowtie/types';

function rowToRecord(row: {
  id: string;
  companyId: string;
  code: string;
  title: string;
  hazard: string;
  topEvent: string;
  activity: string;
  area: string;
  criticality: string;
  diagramData: string;
  markdown: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  let model: BowtieModel;
  try {
    model = decodeBowtie(row.diagramData);
  } catch {
    model = {
      version: '1.0',
      code: row.code,
      title: row.title,
      hazard: row.hazard,
      topEvent: row.topEvent,
      activity: row.activity,
      area: row.area,
      criticality: row.criticality as 'critico' | 'alto',
      normRefs: [],
      threats: [],
      consequences: [],
      metadata: {
        companyName: '',
        rut: '',
        generatedAt: row.createdAt.toISOString(),
      },
    };
  }
  return {
    id: row.id,
    companyId: row.companyId,
    model,
    markdown: row.markdown ?? undefined,
    status: row.status as 'borrador' | 'generado' | 'aprobado',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get('companyId');
    if (!companyId) {
      return NextResponse.json({ success: false, error: 'companyId requerido' }, { status: 400 });
    }
    const rows = await db.bowtieAnalysis.findMany({
      where: { companyId },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json({
      success: true,
      items: rows.map(rowToRecord),
    });
  } catch (error) {
    console.error('Bowtie GET:', error);
    return NextResponse.json({ success: false, error: 'Error al listar Bowties' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, model, markdown, status, id } = body as {
      companyId: string;
      model: BowtieModel;
      markdown?: string;
      status?: string;
      id?: string;
    };

    if (!companyId || !model) {
      return NextResponse.json({ success: false, error: 'companyId y model requeridos' }, { status: 400 });
    }

    const diagramData = encodeBowtie(model);
    const payload = {
      code: model.code,
      title: model.title,
      hazard: model.hazard,
      topEvent: model.topEvent,
      activity: model.activity ?? '',
      area: model.area ?? '',
      criticality: model.criticality,
      diagramData,
      markdown: markdown ?? null,
      status: status ?? 'generado',
    };

    const row = id
      ? await db.bowtieAnalysis.update({ where: { id }, data: payload })
      : await db.bowtieAnalysis.create({ data: { companyId, ...payload } });

    return NextResponse.json({ success: true, item: rowToRecord(row) });
  } catch (error) {
    console.error('Bowtie POST:', error);
    return NextResponse.json({ success: false, error: 'Error al guardar Bowtie' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'id requerido' }, { status: 400 });
    }
    await db.bowtieAnalysis.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bowtie DELETE:', error);
    return NextResponse.json({ success: false, error: 'Error al eliminar' }, { status: 500 });
  }
}
