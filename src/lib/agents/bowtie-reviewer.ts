import { z } from 'zod';
import type { BowtieModel } from '@/lib/bowtie/types';
import type { AgentReviewResult } from '@/lib/agents/types';
import { runZaiChat, extractJsonBlock } from '@/lib/agents/zai-runner';
import { encodeBowtie } from '@/lib/bowtie/encode';

const reviewSchema = z.object({
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
});

function buildReviewerSystemPrompt(): string {
  return `Eres auditor SST senior en Chile (DT, ISL, ISO 45001, DS 44).
Revisas análisis Bowtie codificados para riesgos críticos/altos.

Responde SOLO JSON:
{
  "approved": boolean,
  "score": 0-100,
  "findings": [{ "id": "...", "severity": "bloqueante|mayor|menor", "category": "...", "message": "...", "suggestion": "..." }],
  "summary": "..."
}

Criterios bloqueantes: barreras genéricas, sin responsable, sin vínculo al evento central, menos de 2 amenazas/consecuencias, sin DS 44/ISO, placeholders.
Criterios mayor: barreras no auditables, sin barrera crítica en riesgo crítico, escalamiento sin controles.
Aprueba solo si score >= 75 y cero hallazgos bloqueantes.`;
}

export async function runBowtieReviewerAgent(
  model: BowtieModel,
  context?: { sector?: string; workerCount?: number }
): Promise<AgentReviewResult> {
  const userPrompt = `Revisa este Bowtie para empresa ${model.metadata.companyName} (RUT ${model.metadata.rut}).
Sector: ${context?.sector ?? model.metadata.sector ?? 'N/D'}
Trabajadores: ${context?.workerCount ?? 'N/D'}
Criticidad declarada: ${model.criticality}

MODELO JSON:
\`\`\`json
${encodeBowtie(model)}
\`\`\``;

  const raw = await runZaiChat(buildReviewerSystemPrompt(), userPrompt, {
    temperature: 0.2,
    maxTokens: 3000,
  });
  const parsed = reviewSchema.parse(extractJsonBlock(raw));
  return parsed;
}
