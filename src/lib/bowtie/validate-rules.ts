import type { BowtieModel } from '@/lib/bowtie/types';
import type { ReviewFinding } from '@/lib/agents/types';

/** Validación determinística (sin IA) — reglas mínimas auditoría Chile. */
export function validateBowtieRules(model: BowtieModel): ReviewFinding[] {
  const findings: ReviewFinding[] = [];

  if (model.threats.length < 2) {
    findings.push({
      id: 'rule-threats-min',
      severity: 'bloqueante',
      category: 'Estructura',
      message: 'Debe haber al menos 2 amenazas.',
      suggestion: 'Agregue amenazas distintas que puedan desencadenar el evento central.',
    });
  }
  if (model.consequences.length < 2) {
    findings.push({
      id: 'rule-conseq-min',
      severity: 'bloqueante',
      category: 'Estructura',
      message: 'Debe haber al menos 2 consecuencias.',
    });
  }

  for (const t of model.threats) {
    if (t.preventiveBarriers.length < 2) {
      findings.push({
        id: `rule-pb-${t.id}`,
        severity: 'mayor',
        category: 'Barreras',
        message: `Amenaza "${t.description.slice(0, 40)}..." requiere ≥2 barreras preventivas.`,
      });
    }
    const hasCritical = t.preventiveBarriers.some((b) => b.isCritical);
    if (!hasCritical && model.criticality === 'critico') {
      findings.push({
        id: `rule-pb-crit-${t.id}`,
        severity: 'menor',
        category: 'Barreras',
        message: `Marque al menos una barrera preventiva crítica en: ${t.description.slice(0, 30)}...`,
      });
    }
  }

  for (const c of model.consequences) {
    if (c.recoveryBarriers.length < 2) {
      findings.push({
        id: `rule-rb-${c.id}`,
        severity: 'mayor',
        category: 'Barreras',
        message: `Consecuencia "${c.description.slice(0, 40)}..." requiere ≥2 barreras de recuperación.`,
      });
    }
  }

  if (!model.normRefs.length) {
    findings.push({
      id: 'rule-norm',
      severity: 'mayor',
      category: 'Normativa',
      message: 'Faltan referencias normativas (DS 44, ISO 45001, etc.).',
    });
  }

  const vague = /por definir|TBD|\[.*\]|lorem|placeholder/i;
  const blob = JSON.stringify(model);
  if (vague.test(blob)) {
    findings.push({
      id: 'rule-vague',
      severity: 'bloqueante',
      category: 'Calidad',
      message: 'El modelo contiene texto genérico o placeholder.',
    });
  }

  return findings;
}

export function rulesToReview(findings: ReviewFinding[], prefix = 'Validación automática'): import('@/lib/agents/types').AgentReviewResult {
  const blocking = findings.filter((f) => f.severity === 'bloqueante');
  const score = Math.max(0, 100 - blocking.length * 25 - findings.filter((f) => f.severity === 'mayor').length * 10);
  return {
    approved: blocking.length === 0 && score >= 70,
    score,
    findings,
    summary:
      findings.length === 0
        ? `${prefix}: estructura mínima cumplida.`
        : `${prefix}: ${findings.length} hallazgo(s), ${blocking.length} bloqueante(s).`,
  };
}
