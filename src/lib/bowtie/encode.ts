import { bowtieModelSchema, type ParsedBowtieModel } from '@/lib/bowtie/schema';
import type { BowtieModel } from '@/lib/bowtie/types';
import { BOWTIE_DOC_CODE_PREFIX } from '@/lib/bowtie/types';

export function encodeBowtie(model: BowtieModel): string {
  return JSON.stringify(model, null, 2);
}

export function decodeBowtie(raw: string): BowtieModel {
  const parsed = JSON.parse(raw) as unknown;
  return bowtieModelSchema.parse(parsed) as BowtieModel;
}

export function tryDecodeBowtie(raw: string): BowtieModel | null {
  try {
    return decodeBowtie(raw);
  } catch {
    return null;
  }
}

export function extractJsonFromAiResponse(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    return JSON.parse(fence[1].trim());
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return JSON.parse(text.slice(start, end + 1));
  }
  throw new Error('No se encontró JSON válido en la respuesta de IA');
}

export function parseBowtieFromAi(text: string): BowtieModel {
  const raw = extractJsonFromAiResponse(text);
  return bowtieModelSchema.parse(raw) as BowtieModel;
}

export function nextBowtieCode(existing: string[]): string {
  const nums = existing
    .map((c) => {
      const m = c.match(/(\d+)$/);
      return m ? parseInt(m[1]!, 10) : 0;
    })
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${BOWTIE_DOC_CODE_PREFIX}-${String(next).padStart(3, '0')}`;
}

export function normalizeAiBowtie(
  partial: ParsedBowtieModel,
  defaults: {
    companyName: string;
    rut: string;
    sector?: string;
    code: string;
  }
): BowtieModel {
  return {
    ...partial,
    version: '1.0',
    code: partial.code || defaults.code,
    metadata: {
      ...partial.metadata,
      companyName: partial.metadata?.companyName || defaults.companyName,
      rut: partial.metadata?.rut || defaults.rut,
      sector: partial.metadata?.sector || defaults.sector,
      generatedAt: partial.metadata?.generatedAt || new Date().toISOString(),
    },
  };
}
