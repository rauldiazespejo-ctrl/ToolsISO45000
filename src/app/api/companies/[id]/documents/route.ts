import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mergeDocumentsFromDb } from '@/lib/document/merge-catalog';
import { parseCompanyBranding } from '@/lib/sync-persistence';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const company = await db.company.findUnique({ where: { id } });
    if (!company) {
      return NextResponse.json({ success: false, error: 'Empresa no encontrada' }, { status: 404 });
    }

    const dbDocs = await db.sstDocument.findMany({
      where: { companyId: id },
      orderBy: { number: 'asc' },
    });

    const documents = mergeDocumentsFromDb(dbDocs);
    const branding = parseCompanyBranding(company as unknown as Record<string, unknown>);

    return NextResponse.json({
      success: true,
      documents,
      company: {
        ...company,
        ...branding,
      },
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ success: false, error: 'Error al obtener documentos' }, { status: 500 });
  }
}
