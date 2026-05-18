import type { BowtieModel } from '@/lib/bowtie/types';
import type { AgentReviewResult } from '@/lib/agents/types';
import { runZaiChat, extractJsonBlock } from '@/lib/agents/zai-runner';
import { bowtieModelSchema } from '@/lib/bowtie/schema';
import { encodeBowtie, normalizeAiBowtie } from '@/lib/bowtie/encode';
import { buildBowtieSystemPrompt } from '@/lib/bowtie/ai-prompt';

function buildFixerSystemPrompt(): string {
  return `${buildBowtieSystemPrompt()}

Eres el agente CORRECTOR. Recibes un Bowtie y hallazgos de auditoría.
Devuelve ÚNICAMENTE el JSON corregido completo (misma estructura v1.0), incorporando todas las mejoras.
No elimines amenazas/consecuencias existentes salvo que sean duplicadas; fortalece barreras y normativa.`;
}

export async function runBowtieFixerAgent(
  model: BowtieModel,
  review: AgentReviewResult
): Promise<BowtieModel> {
  const findingsText = review.findings
    .map((f) => `- [${f.severity}] ${f.category}: ${f.message}${f.suggestion ? ` → ${f.suggestion}` : ''}`)
    .join('\n');

  const userPrompt = `Corrige el siguiente Bowtie según los hallazgos del revisor.

HALLAZGOS:
${findingsText}

RESUMEN REVISOR: ${review.summary}

BOWTIE ACTUAL:
\`\`\`json
${encodeBowtie(model)}
\`\`\``;

  const raw = await runZaiChat(buildFixerSystemPrompt(), userPrompt, {
    temperature: 0.35,
    maxTokens: 7000,
  });
  const parsed = bowtieModelSchema.parse(extractJsonBlock(raw));
  return normalizeAiBowtie(parsed, {
    companyName: model.metadata.companyName,
    rut: model.metadata.rut,
    sector: model.metadata.sector,
    code: model.code,
  });
}
