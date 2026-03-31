import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Validation schema for company data
const companySchema = z.object({
  name: z.string().min(1, 'La razón social es requerida'),
  rut: z.string().min(1, 'El RUT es requerido'),
  business: z.string().min(1, 'El giro es requerido'),
  address: z.string().min(1, 'La dirección es requerida'),
  size: z.enum(['MIPYME', 'Mediana', 'Grande']),
  workerCount: z.number().int().min(1, 'Debe tener al menos 1 trabajador'),
  sector: z.string().min(1, 'El sector es requerido'),
  logoPath: z.string().optional(),
});

// POST: Save or update company data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = companySchema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.issues[0];
      return NextResponse.json(
        { success: false, error: firstError?.message || 'Datos inválidos' },
        { status: 400 }
      );
    }

    const data = result.data;

    // Check if a company already exists (single-company app)
    const existingCompany = await db.company.findFirst();

    let company;
    if (existingCompany) {
      // Update existing
      company = await db.company.update({
        where: { id: existingCompany.id },
        data: {
          name: data.name,
          rut: data.rut,
          business: data.business,
          address: data.address,
          size: data.size,
          workerCount: data.workerCount,
          sector: data.sector,
          ...(data.logoPath ? { logoPath: data.logoPath } : {}),
        },
      });
    } else {
      // Create new
      company = await db.company.create({
        data: {
          name: data.name,
          rut: data.rut,
          business: data.business,
          address: data.address,
          size: data.size,
          workerCount: data.workerCount,
          sector: data.sector,
          ...(data.logoPath ? { logoPath: data.logoPath } : {}),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: company.id,
        name: company.name,
        rut: company.rut,
        business: company.business,
        address: company.address,
        size: company.size,
        workerCount: company.workerCount,
        sector: company.sector,
        logoPath: company.logoPath,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      },
    });
  } catch (error) {
    console.error('Company POST error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json(
      { success: false, error: `Error al guardar empresa: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// GET: Load company data
export async function GET() {
  try {
    const company = await db.company.findFirst();

    if (!company) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: company.id,
        name: company.name,
        rut: company.rut,
        business: company.business,
        address: company.address,
        size: company.size,
        workerCount: company.workerCount,
        sector: company.sector,
        logoPath: company.logoPath,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      },
    });
  } catch (error) {
    console.error('Company GET error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json(
      { success: false, error: `Error al cargar empresa: ${errorMessage}` },
      { status: 500 }
    );
  }
}
