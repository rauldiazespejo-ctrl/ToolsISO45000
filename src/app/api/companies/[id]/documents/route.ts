import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const documents = await db.sstDocument.findMany({
      where: { companyId: id },
      orderBy: { number: 'asc' },
    });

    return NextResponse.json({ success: true, documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ success: false, error: 'Error al obtener documentos' }, { status: 500 });
  }
}
