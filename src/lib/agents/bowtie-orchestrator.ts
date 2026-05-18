import type { BowtieGenerateInput } from '@/lib/bowtie/ai-prompt';
import type { AgentStepLog, AgentReviewResult, BowtiePipelineResult } from '@/lib/agents/types';
import { runBowtieGeneratorAgent } from '@/lib/agents/bowtie-generator';
import { runBowtieReviewerAgent } from '@/lib/agents/bowtie-reviewer';
import { runBowtieFixerAgent } from '@/lib/agents/bowtie-fixer';
import { validateBowtieRules, rulesToReview } from '@/lib/bowtie/validate-rules';
import { renderBowtieMarkdown } from '@/lib/bowtie/render-markdown';
import { renderBowtieSvg } from '@/lib/bowtie/render-svg';
import type { ReviewFinding } from '@/lib/agents/types';

const MAX_FIX_ITERATIONS = 2;

function mergeReviews(ruleReview: AgentReviewResult, aiReview: AgentReviewResult): AgentReviewResult {
  const findings: ReviewFinding[] = [...ruleReview.findings, ...aiReview.findings];
  const blocking = findings.filter((f) => f.severity === 'bloqueante');
  const score = Math.round((ruleReview.score + aiReview.score) / 2);
  const approved = blocking.length === 0 && score >= 75 && aiReview.approved && ruleReview.approved;
  return {
    approved,
    score,
    findings,
    summary: `Reglas: ${ruleReview.summary} | Auditor IA: ${aiReview.summary}`,
  };
}

function step(
  log: AgentStepLog[],
  agent: AgentStepLog['agent'],
  label: string,
  status: AgentStepLog['status'],
  message?: string
) {
  const existing = log.find((s) => s.agent === agent && s.status === 'running');
  if (existing) {
    existing.status = status;
    existing.finishedAt = new Date().toISOString();
    existing.message = message;
    return;
  }
  log.push({
    agent,
    label,
    status,
    startedAt: new Date().toISOString(),
    finishedAt: status !== 'running' ? new Date().toISOString() : undefined,
    message,
  });
}

export async function runBowtieMultiAgentPipeline(
  input: BowtieGenerateInput,
  opts?: { sector?: string; workerCount?: number; skipFix?: boolean }
): Promise<BowtiePipelineResult> {
  const pipelineLog: AgentStepLog[] = [];
  let iterations = 0;

  step(pipelineLog, 'bowtie-generator', 'Agente generador Bowtie', 'running');
  let model = await runBowtieGeneratorAgent(input);
  step(pipelineLog, 'bowtie-generator', 'Agente generador Bowtie', 'done', `Código ${model.code}`);

  while (iterations <= MAX_FIX_ITERATIONS) {
    iterations++;

    const ruleFindings = validateBowtieRules(model);
    const ruleReview = rulesToReview(ruleFindings);

    step(pipelineLog, 'bowtie-reviewer', `Auditoría (iteración ${iterations})`, 'running');
    let aiReview: AgentReviewResult;
    try {
      aiReview = await runBowtieReviewerAgent(model, {
        sector: opts?.sector ?? input.sector,
        workerCount: opts?.workerCount ?? input.workerCount,
      });
    } catch (e) {
      aiReview = {
        approved: false,
        score: 50,
        findings: [
          {
            id: 'reviewer-error',
            severity: 'mayor',
            category: 'Sistema',
            message: e instanceof Error ? e.message : 'Error en agente revisor',
          },
        ],
        summary: 'Revisor IA no disponible; aplicar solo reglas automáticas.',
      };
    }
    const review = mergeReviews(ruleReview, aiReview);
    step(
      pipelineLog,
      'bowtie-reviewer',
      `Auditoría (iteración ${iterations})`,
      'done',
      `Score ${review.score}% — ${review.approved ? 'Aprobado' : 'Requiere corrección'}`
    );

    if (review.approved || opts?.skipFix) {
      return {
        model,
        markdown: renderBowtieMarkdown(model),
        svgDiagram: renderBowtieSvg(model),
        review,
        pipelineLog,
        iterations,
      };
    }

    const blocking = review.findings.filter((f) => f.severity === 'bloqueante');
    const needsFix = blocking.length > 0 || review.score < 75;
    if (!needsFix || iterations > MAX_FIX_ITERATIONS) {
      return {
        model,
        markdown: renderBowtieMarkdown(model),
        svgDiagram: renderBowtieSvg(model),
        review,
        pipelineLog,
        iterations,
      };
    }

    step(pipelineLog, 'bowtie-fixer', `Agente corrector (iteración ${iterations})`, 'running');
    model = await runBowtieFixerAgent(model, review);
    step(pipelineLog, 'bowtie-fixer', `Agente corrector (iteración ${iterations})`, 'done', 'Modelo actualizado');
  }

  const finalRules = rulesToReview(validateBowtieRules(model));
  return {
    model,
    markdown: renderBowtieMarkdown(model),
    svgDiagram: renderBowtieSvg(model),
    review: finalRules,
    pipelineLog,
    iterations,
  };
}
