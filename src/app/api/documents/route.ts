import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { ALL_DOCUMENTS } from '@/lib/sst-documents';

// Valid statuses
const VALID_STATUSES = ['Pendiente', 'En Proceso', 'Completado', 'No Aplica'] as const;

// Schema for updating a document
const updateDocumentSchema = z.object({
  number: z.number().int().min(1).max(46),
  status: z.enum(VALID_STATUSES).optional(),
  generatedContent: z.string().optional(),
  version: z.number().int().min(1).optional(),
  docxPath: z.string().optional(),
});

// GET: Return all documents with their current statuses
export async function GET(request: NextRequest) {
  try {
    // Try to get documents from DB (if company exists)
    const company = await db.company.findFirst();

    if (!company) {
      // No company configured yet - return default documents
      return NextResponse.json({
        success: true,
        data: ALL_DOCUMENTS.map((doc) => ({
          ...doc,
          generatedContent: null,
          docxPath: null,
          version: 1,
        })),
        source: 'default',
      });
    }

    // Get documents from DB
    const dbDocuments = await db.sstDocument.findMany({
      where: { companyId: company.id },
      orderBy: { number: 'asc' },
    });

    // Create a map of DB documents by number for quick lookup
    const dbDocMap = new Map(dbDocuments.map((d) => [d.number, d]));

    // Merge DB data with default document definitions
    const mergedDocuments = ALL_DOCUMENTS.map((defaultDoc) => {
      const dbDoc = dbDocMap.get(defaultDoc.number);

      return {
        ...defaultDoc,
        id: dbDoc?.id || null,
        status: dbDoc?.status || defaultDoc.status,
        generatedContent: dbDoc?.generatedContent || null,
        docxPath: dbDoc?.docxPath || null,
        version: dbDoc?.version || 1,
        createdAt: dbDoc?.createdAt || null,
        updatedAt: dbDoc?.updatedAt || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: mergedDocuments,
      source: 'database',
      companyId: company.id,
    });
  } catch (error) {
    console.error('Documents GET error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json(
      { success: false, error: `Error al cargar documentos: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// PUT: Update document status and generated content
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = updateDocumentSchema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.issues[0];
      return NextResponse.json(
        { success: false, error: firstError?.message || 'Datos inválidos' },
        { status: 400 }
      );
    }

    const { number, status, generatedContent, version, docxPath } = result.data;

    // Company must exist
    const company = await db.company.findFirst();
    if (!company) {
      return NextResponse.json(
        { success: false, error: 'No hay empresa configurada. Configure la empresa primero.' },
        { status: 400 }
      );
    }

    // Find the default document definition
    const defaultDoc = ALL_DOCUMENTS.find((d) => d.number === number);
    if (!defaultDoc) {
      return NextResponse.json(
        { success: false, error: `Documento N° ${number} no encontrado` },
        { status: 404 }
      );
    }

    // Check if document exists in DB
    const existingDoc = await db.sstDocument.findFirst({
      where: { companyId: company.id, number },
    });

    let updatedDoc;

    if (existingDoc) {
      // Update existing document
      const updateData: any = {};
      if (status !== undefined) updateData.status = status;
      if (generatedContent !== undefined) updateData.generatedContent = generatedContent;
      if (version !== undefined) updateData.version = version;
      if (docxPath !== undefined) updateData.docxPath = docxPath;

      // If content is generated, ensure status is Completado
      if (generatedContent && !status) {
        updateData.status = 'Completado';
      }

      updatedDoc = await db.sstDocument.update({
        where: { id: existingDoc.id },
        data: updateData,
      });
    } else {
      // Create document in DB with provided data
      const createData: any = {
        companyId: company.id,
        number: defaultDoc.number,
        category: defaultDoc.category,
        name: defaultDoc.name,
        description: defaultDoc.description,
        responsible: defaultDoc.responsible,
        priority: defaultDoc.priority,
        normSource: defaultDoc.normSource,
        normRef: defaultDoc.normRef,
        status: status || defaultDoc.status,
      };

      if (generatedContent !== undefined) createData.generatedContent = generatedContent;
      if (version !== undefined) createData.version = version;
      if (docxPath !== undefined) createData.docxPath = docxPath;
      if (generatedContent) createData.status = 'Completado';

      updatedDoc = await db.sstDocument.create({
        data: createData,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedDoc.id,
        number: updatedDoc.number,
        status: updatedDoc.status,
        generatedContent: updatedDoc.generatedContent,
        docxPath: updatedDoc.docxPath,
        version: updatedDoc.version,
        updatedAt: updatedDoc.updatedAt,
      },
    });
  } catch (error) {
    console.error('Documents PUT error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json(
      { success: false, error: `Error al actualizar documento: ${errorMessage}` },
      { status: 500 }
    );
  }
}
