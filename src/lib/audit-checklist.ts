import { SstDocumentItem } from '@/types/sst';

export interface AuditChecklistItem {
  id: string;
  label: string;
  hint?: string;
  normRef?: string;
}

const UNIVERSAL_ITEMS: AuditChecklistItem[] = [
  {
    id: 'norm-ds44',
    label: 'Cita artículos concretos del DS N° 44/2024',
    hint: 'Debe aparecer al menos un artículo del DS 44 citado textualmente.',
    normRef: 'DS 44',
  },
  {
    id: 'norm-16744',
    label: 'Referencia a Ley N° 16.744 cuando corresponda',
    normRef: 'Ley 16.744',
  },
  {
    id: 'alcance',
    label: 'Alcance del documento definido (qué incluye y qué excluye)',
  },
  {
    id: 'responsables',
    label: 'Responsabilidades asignadas por cargo (no genéricas)',
  },
  {
    id: 'registros',
    label: 'Registros asociados con responsable y frecuencia',
  },
  {
    id: 'evidencia',
    label: 'Criterios o evidencia verificable para auditoría',
    hint: 'Lista de pruebas que el auditor podría solicitar.',
  },
  {
    id: 'vigencia',
    label: 'Vigencia, revisión y control de cambios indicados',
  },
  {
    id: 'sin-placeholder',
    label: 'Sin placeholders ([nombre], TBD, por definir)',
  },
  {
    id: 'datos-empresa',
    label: 'Datos reales de la empresa (razón social, RUT, tamaño)',
  },
  {
    id: 'firmas-formal',
    label: 'Firmas de formalización configuradas (Elaborado / Revisado / Aprobado)',
    hint: 'Verifica en la descarga .docx la tabla de la portada.',
  },
];

const BY_CATEGORY: Record<string, AuditChecklistItem[]> = {
  A: [
    {
      id: 'cat-a-contexto',
      label: 'Contexto, partes interesadas o alcance del SG-SST abordado',
      normRef: 'DS 44 Art. 3-4 · ISO 45001 §4',
    },
  ],
  B: [
    {
      id: 'cat-b-miper',
      label: 'Identificación de peligros, evaluación de riesgos o controles',
      normRef: 'DS 44 Art. 7',
    },
  ],
  C: [
    {
      id: 'cat-c-operacion',
      label: 'Controles operacionales, EPP, máquinas o procedimiento de trabajo seguro',
      normRef: 'DS 44 Art. 10-16',
    },
  ],
  D: [
    {
      id: 'cat-d-participacion',
      label: 'Participación de trabajadores, CPHS o delegado según tamaño',
      normRef: 'DS 44 Art. 17, 23-49, 66',
    },
  ],
  F: [
    {
      id: 'cat-f-emergencia',
      label: 'Emergencias, simulacros, evacuación o riesgos graves',
      normRef: 'DS 44 Art. 18-19',
    },
  ],
  G: [
    {
      id: 'cat-g-vigilancia',
      label: 'Vigilancia ambiental o de la salud de los trabajadores',
      normRef: 'Ley 16.744',
    },
  ],
  H: [
    {
      id: 'cat-h-incidentes',
      label: 'Reporte, investigación o estadísticas de accidentabilidad',
      normRef: 'DS 44 Art. 71',
    },
  ],
  K: [
    {
      id: 'cat-k-auditoria',
      label: 'Auditoría interna, revisión por la dirección o mejora continua',
      normRef: 'DS 44 Art. 64',
    },
  ],
  L: [
    {
      id: 'cat-l-fiscalizacion',
      label: 'Autoevaluación FUF o preparación para fiscalización',
      normRef: 'DS 44 Art. 72',
    },
  ],
};

const BY_DOCUMENT: Record<number, AuditChecklistItem[]> = {
  4: [
    {
      id: 'doc4-politica',
      label: 'Política SST firmada o con compromiso explícito de Alta Dirección',
      normRef: 'DS 44 Art. 22',
    },
  ],
  7: [
    {
      id: 'doc7-miper',
      label: 'MIPER con jerarquía de controles y actualización periódica',
      normRef: 'DS 44 Art. 7',
    },
    {
      id: 'doc7-bowtie',
      label: 'Análisis Bowtie codificado para riesgos críticos/altos identificados',
      hint: 'Genere en Dashboard → Bowtie y archive el JSON/Word como evidencia.',
      normRef: 'ISO 45001 §6.1.2',
    },
  ],
  21: [
    {
      id: 'doc21-cphs',
      label: 'CPHS: composición, reuniones y atribuciones (si aplica por tamaño)',
      normRef: 'DS 44 Art. 23-49',
    },
  ],
  45: [
    {
      id: 'doc45-fuf',
      label: 'Autoevaluación alineada al Formulario Único de Fiscalización',
      normRef: 'DS 44 Art. 72',
    },
  ],
};

export function getAuditChecklistForDocument(doc: SstDocumentItem): AuditChecklistItem[] {
  const specific = BY_DOCUMENT[doc.number] ?? [];
  const category = BY_CATEGORY[doc.category] ?? [];
  const seen = new Set<string>();
  const merged: AuditChecklistItem[] = [];
  for (const item of [...UNIVERSAL_ITEMS, ...category, ...specific]) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged;
}

export function getAuditChecklistProgress(
  items: AuditChecklistItem[],
  checks: Record<string, boolean> | undefined
): { done: number; total: number; percent: number; complete: boolean } {
  const total = items.length;
  const done = items.filter((i) => checks?.[i.id]).length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return { done, total, percent, complete: done === total && total > 0 };
}
