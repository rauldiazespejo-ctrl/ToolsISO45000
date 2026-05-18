import type { ReviewFinding } from '@/lib/agents/types';

/** Reglas rápidas sobre Markdown SST antes/después de revisión IA. */
export function validateDocumentRules(content: string, meta: { companyName: string; rut: string }): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const lower = content.toLowerCase();

  if (!content.trim() || content.length < 500) {
    findings.push({
      id: 'doc-short',
      severity: 'bloqueante',
      category: 'Estructura',
      message: 'Documento demasiado corto o vacío.',
    });
  }

  if (/por definir|TBD|\[nombre\]|\[fecha\]|\[cargo\]/i.test(content)) {
    findings.push({
      id: 'doc-placeholder',
      severity: 'bloqueante',
      category: 'Calidad',
      message: 'Contiene placeholders o texto por completar.',
    });
  }

  if (!/ds\s*44|decreto\s*supremo\s*n?[°º]?\s*44/i.test(lower)) {
    findings.push({
      id: 'doc-ds44',
      severity: 'mayor',
      category: 'Normativa',
      message: 'No se detecta cita al DS N° 44/2024.',
      suggestion: 'Agregar base legal con artículos concretos del DS 44.',
    });
  }

  if (!lower.includes(meta.companyName.toLowerCase().slice(0, 8)) && meta.companyName.length > 3) {
    findings.push({
      id: 'doc-company',
      severity: 'mayor',
      category: 'Datos empresa',
      message: 'No se menciona claramente la razón social de la empresa.',
    });
  }

  if (!/evidencia|auditoría|auditoria|criterios de aceptación/i.test(lower)) {
    findings.push({
      id: 'doc-evidence',
      severity: 'menor',
      category: 'Auditoría',
      message: 'Falta sección explícita de evidencia o criterios de aceptación.',
    });
  }

  return findings;
}

export function rulesToDocumentReview(
  findings: ReviewFinding[]
): import('@/lib/agents/types').AgentReviewResult {
  const blocking = findings.filter((f) => f.severity === 'bloqueante');
  const score = Math.max(0, 100 - blocking.length * 30 - findings.filter((f) => f.severity === 'mayor').length * 12);
  return {
    approved: blocking.length === 0 && score >= 70,
    score,
    findings,
    summary:
      findings.length === 0
        ? 'Validación automática: estructura mínima OK.'
        : `Validación automática: ${findings.length} hallazgo(s).`,
  };
}
