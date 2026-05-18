import { z } from 'zod';
import type { DocumentReviewResult } from '@/lib/agents/types';
import { runZaiChat, extractJsonBlock } from '@/lib/agents/zai-runner';

const docReviewSchema = z.object({
  approved: z.boolean(),
  score: z.number().min(0).max(100),
  findings: z.array(
    z.object({
      id: z.string(),
      severity: z.enum(['bloqueante', 'mayor', 'menor']),
      category: z.string(),
      message: z.string(),
      suggestion: z.string().optional(),
    })
  ),
  summary: z.string(),
  suggestedPatches: z
    .array(z.object({ section: z.string(), suggestion: z.string() }))
    .optional(),
});

function buildDocumentReviewerSystem(): string {
  return `Eres revisor experto en documentación SG-SST Chile (DS 44, Ley 16.744, ISO 45001).
Evalúas borradores antes de entrega a auditoría DT/ISL/certificación.

Responde SOLO JSON:
{
  "approved": boolean,
  "score": 0-100,
  "findings": [{ "id", "severity": "bloqueante|mayor|menor", "category", "message", "suggestion?" }],
  "summary": "...",
  "suggestedPatches": [{ "section": "...", "suggestion": "..." }]
}

Bloqueantes: sin artículos DS 44, placeholders, responsables genéricos, sin registros/evidencia, políticas sin alta dirección cuando aplica.
Aprueba solo con score >= 78 y cero bloqueantes.`;
}

export interface DocumentReviewInput {
  docNumber: number;
  docName: string;
  normRef: string;
  companyName: string;
  rut: string;
  size: string;
  content: string;
}

export async function runDocumentReviewerAgent(input: DocumentReviewInput): Promise<DocumentReviewResult> {
  const userPrompt = `Revisa el documento SST:

Empresa: ${input.companyName} (${input.rut}) — Tamaño: ${input.size}
Documento N°${input.docNumber}: ${input.docName}
Normativa: ${input.normRef}

CONTENIDO (Markdown):
---
${input.content.slice(0, 12000)}
${input.content.length > 12000 ? '\n...[truncado para revisión]...' : ''}
---`;

  const raw = await runZaiChat(buildDocumentReviewerSystem(), userPrompt, {
    temperature: 0.2,
    maxTokens: 3500,
  });
  return docReviewSchema.parse(extractJsonBlock(raw));
}
