import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CATEGORIES, ALL_DOCUMENTS } from '@/lib/sst-documents';

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

    // Create or update company
    const companyPayload = {
      name: data.name,
      rut: data.rut,
      business: data.business || '',
      address: data.address || '',
      size: data.size || 'MIPYME',
      workerCount: parseInt(data.workerCount) || 0,
      sector: data.sector || '',
      logoData: data.logoData || null,
      brandingMode: data.brandingMode || 'pulso',
      clientLogoPath: data.clientLogoPath || null,
    };

    let company;
    if (data.id) {
      // Update existing company
      company = await db.company.update({
        where: { id: data.id },
        data: companyPayload,
      });
    } else {
      // Create new company
      company = await db.company.create({
        data: companyPayload,
      });
    }

    // Initialize documents if it's a new company
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

      await db.sstDocument.createMany({
        data: docsToCreate,
      });
    }

    return NextResponse.json({ success: true, company });
  } catch (error) {
    console.error('Error saving company:', error);
    return NextResponse.json({ success: false, error: 'Error al guardar empresa' }, { status: 500 });
  }
}
