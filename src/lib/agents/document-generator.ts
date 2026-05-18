import { buildChileSstSystemPrompt, buildChileSstUserSuffix } from '@/lib/chile-sst-prompt';
import { runZaiChat } from '@/lib/agents/zai-runner';

export interface DocumentGenerateInput {
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

function buildUserPrompt(data: DocumentGenerateInput): string {
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

Genera el documento completo en formato Markdown con todas las secciones indicadas en las instrucciones.${buildChileSstUserSuffix({
    docNumber: data.docNumber,
    normRef: data.normRef,
    size: data.size,
    workerCount: data.workerCount,
    sector: data.sector,
  })}`;
}

export async function runDocumentGeneratorAgent(input: DocumentGenerateInput): Promise<string> {
  return runZaiChat(buildChileSstSystemPrompt(), buildUserPrompt(input), {
    temperature: 0.7,
    maxTokens: 8000,
    timeoutMs: 120_000,
  });
}
