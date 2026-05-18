import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { buildChileSstSystemPrompt, buildChileSstUserSuffix } from '@/lib/chile-sst-prompt';

const GENERATION_TIMEOUT = 120_000; // 2 minutes

interface GenerateRequest {
  docNumber: number;
  docName: string;
  description: string;
  normRef: string;
  companyName: string;
  rut: string;
  business: string;
  size: string;
  workerCount: number;
  sector: string;
}

function buildSystemPrompt(): string {
  return buildChileSstSystemPrompt();
}

function buildUserPrompt(data: GenerateRequest): string {
  const sizeDescription: Record<string, string> = {
    MIPYME: 'MIPYME (Micro, Pequeña y Mediana Empresa - hasta 25 trabajadores)',
    Mediana: 'Mediana Empresa (26 a 99 trabajadores)',
    Grande: 'Gran Empresa (100 o más trabajadores)',
  };

  return `Genera el siguiente documento SST para la empresa:

**Datos de la Empresa:**
- Razón Social: ${data.companyName}
- RUT: ${data.rut}
- Giro: ${data.business}
- Tamaño: ${sizeDescription[data.size] || data.size}
- Número de Trabajadores: ${data.workerCount}
- Sector Económico: ${data.sector}

**Documento a Generar:**
- N° de Documento: ${data.docNumber}
- Nombre: ${data.docName}
- Descripción/Alcance: ${data.description}
- Referencia Normativa: ${data.normRef}

Genera el documento completo en formato Markdown con todas las secciones indicadas en las instrucciones. El contenido debe ser detallado, profesional y directamente aplicable a la empresa indicada. Adapta la profundidad y complejidad según el tamaño de la empresa (una MIPYME necesita procedimientos más simples que una gran empresa).${buildChileSstUserSuffix({
    docNumber: data.docNumber,
    normRef: data.normRef,
    size: data.size,
    workerCount: data.workerCount,
    sector: data.sector,
  })}`;
}

async function generateWithTimeout(
  userPrompt: string,
  systemPrompt: string,
  timeoutMs: number
): Promise<string> {
  const zai = await ZAI.create();

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('La generación excedió el tiempo límite. Intente nuevamente.')), timeoutMs);
  });

  const generationPromise = zai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 8000,
  });

  const completion = await Promise.race([generationPromise, timeoutPromise]);

  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('El modelo no generó contenido válido.');
  }

  return content;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GenerateRequest;

    // Validate required fields
    const requiredFields: (keyof GenerateRequest)[] = [
      'docNumber', 'docName', 'description', 'normRef',
      'companyName', 'rut', 'business', 'size', 'workerCount', 'sector',
    ];

    for (const field of requiredFields) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json(
          { success: false, error: `Campo requerido faltante: ${field}` },
          { status: 400 }
        );
      }
    }

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(body);

    // Attempt generation with retry
    let content: string;
    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
      try {
        content = await generateWithTimeout(userPrompt, systemPrompt, GENERATION_TIMEOUT);
        break;
      } catch (error) {
        retries++;
        if (retries > maxRetries) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          console.error(`Generation failed after ${maxRetries} retries:`, errorMessage);
          return NextResponse.json(
            { success: false, error: `Error al generar el documento: ${errorMessage}` },
            { status: 500 }
          );
        }
        // Brief pause before retry
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    return NextResponse.json({
      success: true,
      content: content!,
    });
  } catch (error) {
    console.error('Generate API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
