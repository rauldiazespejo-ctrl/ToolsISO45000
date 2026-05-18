import { z } from 'zod';

const barrierSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(['preventivo', 'mitigador', 'recuperacion']),
  responsible: z.string().optional(),
  effectiveness: z.enum(['alta', 'media', 'baja']).optional(),
  isCritical: z.boolean().optional(),
});

const threatSchema = z.object({
  id: z.string(),
  description: z.string().min(1),
  preventiveBarriers: z.array(barrierSchema).min(1),
  escalations: z
    .array(
      z.object({
        id: z.string(),
        factor: z.string(),
        controls: z.array(z.string()),
      })
    )
    .optional(),
});

const consequenceSchema = z.object({
  id: z.string(),
  description: z.string().min(1),
  severity: z.enum(['menor', 'moderado', 'mayor', 'catastrofico']),
  recoveryBarriers: z.array(barrierSchema).min(1),
});

export const bowtieModelSchema = z.object({
  version: z.literal('1.0'),
  code: z.string().min(1),
  title: z.string().min(1),
  hazard: z.string().min(1),
  topEvent: z.string().min(1),
  activity: z.string(),
  area: z.string(),
  criticality: z.enum(['critico', 'alto']),
  normRefs: z.array(z.string()),
  threats: z.array(threatSchema).min(1),
  consequences: z.array(consequenceSchema).min(1),
  metadata: z.object({
    companyName: z.string(),
    rut: z.string(),
    sector: z.string().optional(),
    generatedAt: z.string(),
    linkedMiperDoc: z.number().optional(),
    notes: z.string().optional(),
  }),
});

export type ParsedBowtieModel = z.infer<typeof bowtieModelSchema>;
