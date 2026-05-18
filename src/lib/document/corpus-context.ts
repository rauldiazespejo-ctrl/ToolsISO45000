import { DOCUMENT_CODES } from '@/lib/sst-documents';
import type { SstDocumentItem } from '@/types/sst';

const EXCERPT_LEN = 600;
const MAX_CORPUS_DOCS = 10;

/** Documentos de la empresa con contenido ya generado (excluye el objetivo). */
export function getDocumentsWithContent(documents: SstDocumentItem[]): SstDocumentItem[] {
  return documents.filter(
    (d) =>
      Boolean(d.generatedContent?.trim()) &&
      d.status !== 'No Aplica' &&
      d.status !== 'Pendiente'
  );
}

/** Contexto textual de otros documentos del paquete SG-SST para alinear revisiones. */
export function buildCorpusContext(
  documents: SstDocumentItem[],
  targetDocNumber: number
): { context: string; referenceCount: number } {
  const others = getDocumentsWithContent(documents)
    .filter((d) => d.number !== targetDocNumber)
    .sort((a, b) => {
      const score = (d: SstDocumentItem) =>
        (d.status === 'Completado' ? 2 : 1) + (d.priority === 'Alta' ? 1 : 0);
      return score(b) - score(a);
    })
    .slice(0, MAX_CORPUS_DOCS);

  if (others.length === 0) {
    return {
      context: 'No hay otros documentos con contenido en el sistema. Revise solo normativa Chile y calidad auditoría.',
      referenceCount: 0,
    };
  }

  const blocks = others.map((d) => {
    const code = DOCUMENT_CODES[d.number] || `DOC-${d.number}`;
    const body = d.generatedContent!.trim();
    const excerpt =
      body.length > EXCERPT_LEN ? `${body.slice(0, EXCERPT_LEN)}\n...[truncado]` : body;
    return `#### ${code} — N°${d.number}: ${d.name}
- Categoría: ${d.categoryName} | Estado: ${d.status} | Prioridad: ${d.priority}
- Responsable catálogo: ${d.responsible}
${excerpt}`;
  });

  return {
    referenceCount: others.length,
    context: `PAQUETE DOCUMENTAL YA CREADO (${others.length} documentos). Use esta información para:
- Unificar terminología, cargos y nombres de registros
- Referenciar cruzadamente otros procedimientos (citar código y N° documento)
- Evitar contradicciones con política, MIPER, roles y emergencias ya definidos
- Mantener coherencia del SG-SST de la empresa

${blocks.join('\n\n')}`,
  };
}
