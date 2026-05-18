import { buildChileSstSystemPrompt } from '@/lib/chile-sst-prompt';
import type { DocumentReviewResult } from '@/lib/agents/types';
import { runZaiChat } from '@/lib/agents/zai-runner';
import type { DocumentReviewInput } from '@/lib/agents/document-reviewer';

function buildFixerSystemPrompt(): string {
  return `${buildChileSstSystemPrompt()}

Eres el agente CORRECTOR de documentos SST.
Recibes un borrador Markdown y hallazgos de auditoría Chile.
Devuelve ÚNICAMENTE el documento Markdown corregido completo (sin JSON, sin explicación previa).
Incorpora todas las correcciones: artículos DS 44, elimina placeholders, responsables por cargo, registros y evidencia auditoría.
Mantén la estructura y mejora las secciones deficientes.`;
}

export async function runDocumentFixerAgent(
  input: DocumentReviewInput,
  review: DocumentReviewResult
): Promise<string> {
  const findingsText = review.findings
    .map(
      (f) =>
        `- [${f.severity}] ${f.category}: ${f.message}${f.suggestion ? ` → ${f.suggestion}` : ''}`
    )
    .join('\n');

  const patchesText =
    review.suggestedPatches
      ?.map((p) => `- Sección "${p.section}": ${p.suggestion}`)
      .join('\n') ?? 'N/A';

  const userPrompt = `Corrige este documento SST según la auditoría.

Empresa: ${input.companyName} (${input.rut}) — ${input.size}
Documento N°${input.docNumber}: ${input.docName}
Normativa: ${input.normRef}

RESUMEN AUDITOR: ${review.summary}

HALLAZGOS:
${findingsText}

SUGERENCIAS POR SECCIÓN:
${patchesText}

DOCUMENTO ACTUAL (Markdown):
---
${input.content.slice(0, 14000)}
${input.content.length > 14000 ? '\n...[documento truncado en entrada; complete las secciones faltantes coherentemente]...' : ''}
---`;

  const fixed = await runZaiChat(buildFixerSystemPrompt(), userPrompt, {
    temperature: 0.45,
    maxTokens: 8000,
    timeoutMs: 120_000,
  });

  const trimmed = fixed.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:markdown|md)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  return trimmed;
}
