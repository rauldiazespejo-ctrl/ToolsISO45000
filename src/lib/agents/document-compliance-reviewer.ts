import type { DocumentReviewResult, ReviewFinding } from '@/lib/agents/types';
import { buildDocumentComplianceTrace } from '@/lib/chile-compliance';

export interface DocumentComplianceReviewInput {
  docNumber: number;
  docName: string;
  content: string;
}

function includesAny(content: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(content));
}

function scoreFromFindings(findings: ReviewFinding[]): number {
  const penalties = findings.reduce((acc, f) => {
    if (f.severity === 'bloqueante') return acc + 25;
    if (f.severity === 'mayor') return acc + 12;
    return acc + 5;
  }, 0);

  return Math.max(0, 100 - penalties);
}

export async function runDocumentComplianceReviewerAgent(
  input: DocumentComplianceReviewInput
): Promise<DocumentReviewResult> {
  const content = input.content || '';
  const trace = buildDocumentComplianceTrace(input.docNumber, input.docName);
  const findings: ReviewFinding[] = [];

  if (!/base legal/i.test(content)) {
    findings.push({
      id: 'comp-base-legal',
      severity: 'bloqueante',
      category: 'Cumplimiento legal',
      message: 'Falta sección explícita de base legal aplicable.',
      suggestion: 'Agregar capítulo "Base legal y normativa aplicable" con normas y artículos.',
    });
  }

  if (!/trazabilidad legal/i.test(content)) {
    findings.push({
      id: 'comp-traceability',
      severity: 'mayor',
      category: 'Trazabilidad',
      message: 'No se detecta sección de trazabilidad legal.',
      suggestion: 'Incluir sección "Trazabilidad legal y control de vigencia".',
    });
  }

  const missingReferences = trace.legalReferences.filter((ref) => {
    const bodyRegex = new RegExp(ref.body.replace('.', '\\.'), 'i');
    return !bodyRegex.test(content);
  });

  if (missingReferences.length > 0) {
    findings.push({
      id: 'comp-missing-refs',
      severity: 'bloqueante',
      category: 'Referencias normativas',
      message: `Faltan referencias legales clave: ${missingReferences
        .map((r) => `${r.body} ${r.article}`)
        .join(', ')}`,
      suggestion: 'Alinear el documento con todas las referencias normativas obligatorias del trazado legal.',
    });
  }

  const missingEvidence = trace.requiredEvidence.filter((ev) => {
    const nameRegex = new RegExp(ev.name.split(' ')[0], 'i');
    return !nameRegex.test(content);
  });

  if (missingEvidence.length > 0) {
    findings.push({
      id: 'comp-missing-evidence',
      severity: 'mayor',
      category: 'Evidencia auditiva',
      message: `No se evidencia cobertura documental completa (${missingEvidence.length} evidencia(s) no detectadas).`,
      suggestion: 'Agregar sección de registros y evidencias exigibles, con frecuencia, responsable y retención.',
    });
  }

  if (
    !includesAny(content, [/(control de cambios|versión|vigencia)/i, /(criterios de aceptación|evidencia para auditoría)/i])
  ) {
    findings.push({
      id: 'comp-governance',
      severity: 'mayor',
      category: 'Gobernanza documental',
      message: 'Faltan señales de control documental (vigencia, versión, criterios de aceptación).',
      suggestion: 'Incluir control de cambios, versión vigente y criterios verificables para auditoría.',
    });
  }

  const score = scoreFromFindings(findings);
  const blockingCount = findings.filter((f) => f.severity === 'bloqueante').length;
  const approved = blockingCount === 0 && score >= 80;

  return {
    approved,
    score,
    findings,
    summary: approved
      ? 'Cumplimiento legal robusto para auditoría Chile.'
      : `Cumplimiento legal insuficiente: ${findings.length} hallazgo(s) detectado(s).`,
    suggestedPatches: findings.map((f) => ({
      section: f.category,
      suggestion: f.suggestion || f.message,
    })),
  };
}
