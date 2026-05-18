import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ALL_DOCUMENTS } from '@/lib/sst-documents';

export async function GET() {
  try {
    const companies = await db.company.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { documents: true }
        }
      }
    });

    return NextResponse.json({ success: true, companies });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ success: false, error: 'Error al obtener empresas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.name || !data.rut) {
      return NextResponse.json({ success: false, error: 'Nombre y RUT son obligatorios' }, { status: 400 });
    }

    let company;

    // If an existing id is provided, update; otherwise always create new
    if (data.id) {
      const existing = await db.company.findUnique({ where: { id: data.id } });
      if (existing) {
        company = await db.company.update({
          where: { id: data.id },
          data: {
            name: data.name,
            rut: data.rut,
            business: data.business || '',
            address: data.address || '',
            size: data.size || 'MIPYME',
            workerCount: parseInt(data.workerCount) || 0,
            sector: data.sector || '',
            logoData: data.logoData ?? existing.logoData,
            brandingMode: data.brandingMode || existing.brandingMode || 'pulso',
          },
        });
      }
    }

    if (!company) {
      company = await db.company.create({
        data: {
          name: data.name,
          rut: data.rut,
          business: data.business || '',
          address: data.address || '',
          size: data.size || 'MIPYME',
          workerCount: parseInt(data.workerCount) || 0,
          sector: data.sector || '',
          logoData: data.logoData || null,
          brandingMode: data.brandingMode || 'pulso',
        },
      });
    }

    // Initialize documents only for new companies (no documents yet)
    const docCount = await db.sstDocument.count({ where: { companyId: company.id } });

    if (docCount === 0) {
      const docsToCreate = ALL_DOCUMENTS.map(doc => ({
        companyId: company.id,
        number: doc.number,
        category: doc.category,
        name: doc.name,
        description: doc.description,
        responsible: doc.responsible,
        priority: doc.priority,
        normSource: doc.normSource,
        normRef: doc.normRef,
        status: doc.status,
      }));

      await db.sstDocument.createMany({ data: docsToCreate });
    }

    return NextResponse.json({ success: true, company });
  } catch (error) {
    console.error('Error saving company:', error);
    return NextResponse.json({ success: false, error: 'Error al guardar empresa' }, { status: 500 });
  }
}
