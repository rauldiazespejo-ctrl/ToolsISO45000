import { buildChileSstSystemPrompt } from '@/lib/chile-sst-prompt';
import { runZaiChat } from '@/lib/agents/zai-runner';
import type { DocumentGenerateInput } from '@/lib/agents/document-generator';

function buildCorpusReviseSystem(): string {
  return `${buildChileSstSystemPrompt()}

Eres el agente ACTUALIZADOR de documentos SST previos.
Recibes un documento ya existente y el contexto de OTROS documentos ya generados en el mismo SG-SST.
Tu tarea: revisar, corregir y ACTUALIZAR el documento objetivo para que quede alineado al paquete documental y a la normativa Chile vigente.

Devuelve ÚNICAMENTE el Markdown completo actualizado (sin JSON ni comentarios previos).
- Incorpora referencias cruzadas a otros documentos del paquete cuando corresponda
- Elimina duplicaciones contradictorias; unifica criterios con el resto del sistema
- Mantén mejoras de auditoría: DS 44, evidencias, responsables, registros
- No elimines secciones obligatorias; amplíalas si el paquete documental lo exige`;
}

export async function runDocumentCorpusReviseAgent(
  meta: DocumentGenerateInput,
  currentContent: string,
  corpusContext: string
): Promise<string> {
  const userPrompt = `Actualiza el documento objetivo según el paquete documental existente.

EMPRESA: ${meta.companyName} (${meta.rut}) — ${meta.size} — ${meta.workerCount} trabajadores — ${meta.sector}

DOCUMENTO OBJETIVO:
- N°${meta.docNumber}: ${meta.docName}
- Descripción catálogo: ${meta.description}
- Normativa: ${meta.normRef}

${corpusContext}

DOCUMENTO ACTUAL A ACTUALIZAR (Markdown):
---
${currentContent.slice(0, 14000)}
${currentContent.length > 14000 ? '\n...[entrada truncada; complete secciones de forma coherente]...' : ''}
---`;

  const revised = await runZaiChat(buildCorpusReviseSystem(), userPrompt, {
    temperature: 0.45,
    maxTokens: 8000,
    timeoutMs: 120_000,
  });

  const trimmed = revised.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:markdown|md)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  return trimmed;
}
