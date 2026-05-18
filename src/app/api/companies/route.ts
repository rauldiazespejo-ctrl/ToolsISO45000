import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CATEGORIES, ALL_DOCUMENTS } from '@/lib/sst-documents';
import { parseCompanyBranding } from '@/lib/sync-persistence';

export async function GET() {
  try {
    const rows = await db.company.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { documents: true }
        }
      }
    });

    const companies = rows.map((c) => {
      const branding = parseCompanyBranding(c as unknown as Record<string, unknown>);
      return { ...c, ...branding };
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

    const companyFields = {
      name: data.name,
      rut: data.rut,
      business: data.business ?? '',
      address: data.address ?? '',
      size: data.size ?? 'MIPYME',
      workerCount: parseInt(String(data.workerCount), 10) || 0,
      sector: data.sector ?? '',
      logoData: data.logoData ?? null,
      signatoriesJson: data.signatories ? JSON.stringify(data.signatories) : undefined,
      brandingJson:
        data.brandPalette || data.brandingMode || data.clientLogoPath
          ? JSON.stringify({
              brandPalette: data.brandPalette,
              brandingMode: data.brandingMode || 'pulso',
              clientLogoPath: data.clientLogoPath,
            })
          : undefined,
    };

    const existing = data.id
      ? await db.company.findUnique({ where: { id: data.id } })
      : await db.company.findFirst({ where: { rut: data.rut } });

    const company = existing
      ? await db.company.update({ where: { id: existing.id }, data: companyFields })
      : await db.company.create({ data: companyFields });

    let signatories = data.signatories;
    let brandPalette = data.brandPalette;
    let brandingMode = data.brandingMode || 'pulso';
    let clientLogoPath = data.clientLogoPath;
    if (company.signatoriesJson) {
      try {
        signatories = JSON.parse(company.signatoriesJson);
      } catch {
        /* keep request payload */
      }
    }
    if (company.brandingJson) {
      try {
        const b = JSON.parse(company.brandingJson);
        brandPalette = b.brandPalette ?? brandPalette;
        brandingMode = b.brandingMode ?? brandingMode;
        clientLogoPath = b.clientLogoPath ?? clientLogoPath;
      } catch {
        /* ignore */
      }
    }

    const companyPayload = {
      ...company,
      clientLogoPath,
      brandPalette,
      signatories,
      brandingMode,
    };

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

    return NextResponse.json({ success: true, company: companyPayload });
  } catch (error) {
    console.error('Error saving company:', error);
    return NextResponse.json({ success: false, error: 'Error al guardar empresa' }, { status: 500 });
  }
}
