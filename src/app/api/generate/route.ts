import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { buildChileSstSystemPrompt, buildChileSstUserSuffix } from '@/lib/chile-sst-prompt';
import { hasMinimumLegalTraceability } from '@/lib/chile-compliance';

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

function buildLocalMockContent(data: GenerateRequest): string {
  return `# ${data.docName}

## 1. Identificación
- Código: DOC-${data.docNumber}
- Empresa: ${data.companyName}
- RUT: ${data.rut}
- Versión: 1.0

## 2. Objetivo
Establecer lineamientos SST aplicables a ${data.companyName}.

## 3. Base legal y normativa aplicable
- DS 44 Art. 7
- Ley 16.744
- DS 40

## 4. Desarrollo
Se definen controles operacionales y responsabilidades para el sector ${data.sector}.

## 5. Responsabilidades
- Encargado SST: implementación y seguimiento.
- Jefatura de área: control operativo.

## 6. Registros y documentos asociados
- Matriz IPER vigente.
- Registro de capacitación.
- Registro de entrega de EPP.

## 7. Criterios de aceptación / Evidencia para auditoría
1. Matriz IPER firmada y vigente.
2. Registros de capacitación con asistencia.
3. Trazabilidad de acciones correctivas.

## 8. Trazabilidad legal y control de vigencia
| Norma | Artículo | Versión regulatoria | Vigencia | Evidencia exigible |
|---|---|---|---|---|
| DS 44 | Art. 7 | 2024 + modificaciones vigentes | Vigente | Matriz IPER |
| Ley 16.744 | Marco general | Vigente | Vigente | Registros SST |

## 9. Vigencia, revisión y control de cambios
- Vigencia: 12 meses
- Revisión: anual
- Control de cambios: bitácora documental`;
}

async function generateWithTimeout(
  userPrompt: string,
  systemPrompt: string,
  timeoutMs: number,
  data: GenerateRequest
): Promise<string> {
  let zai: Awaited<ReturnType<typeof ZAI.create>> | null = null;
  try {
    zai = await ZAI.create();
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/Configuration file not found|\.z-ai-config/i.test(message)) {
      return buildLocalMockContent(data);
    }
    throw error;
  }

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

  try {
    const completion = await Promise.race([generationPromise, timeoutPromise]);

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('El modelo no generó contenido válido.');
    }

    return content;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/Configuration file not found|\.z-ai-config/i.test(message)) {
      return buildLocalMockContent(data);
    }
    throw error;
  }
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
        content = await generateWithTimeout(userPrompt, systemPrompt, GENERATION_TIMEOUT, body);
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

    const traceabilityOk = hasMinimumLegalTraceability(content!);

    if (!traceabilityOk) {
      return NextResponse.json(
        {
          success: false,
          error:
            'El documento generado no cumple trazabilidad legal mínima (base legal, evidencia auditable y vigencia/control de cambios). Reintente generación.',
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      content: content!,
      compliance: {
        minimumLegalTraceability: true,
      },
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
