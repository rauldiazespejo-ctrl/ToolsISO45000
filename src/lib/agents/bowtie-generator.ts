import type { BowtieModel } from '@/lib/bowtie/types';
import { buildBowtieSystemPrompt, buildBowtieUserPrompt, type BowtieGenerateInput } from '@/lib/bowtie/ai-prompt';
import { parseBowtieFromAi, normalizeAiBowtie } from '@/lib/bowtie/encode';
import { runZaiChat } from '@/lib/agents/zai-runner';

export async function runBowtieGeneratorAgent(input: BowtieGenerateInput): Promise<BowtieModel> {
  const raw = await runZaiChat(buildBowtieSystemPrompt(), buildBowtieUserPrompt(input), {
    temperature: 0.5,
    maxTokens: 6000,
  });
  const parsed = parseBowtieFromAi(raw);
  return normalizeAiBowtie(parsed, {
    companyName: input.companyName,
    rut: input.rut,
    sector: input.sector,
    code: input.code,
  });
}
