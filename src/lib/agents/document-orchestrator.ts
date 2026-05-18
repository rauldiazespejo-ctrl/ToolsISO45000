import type { AgentStepLog, AgentReviewResult, DocumentReviewResult } from '@/lib/agents/types';
import {
  runDocumentReviewerAgent,
  type DocumentReviewInput,
} from '@/lib/agents/document-reviewer';
import { runDocumentFixerAgent } from '@/lib/agents/document-fixer';
import { runDocumentGeneratorAgent, type DocumentGenerateInput } from '@/lib/agents/document-generator';
import { runDocumentCorpusReviseAgent } from '@/lib/agents/document-corpus-revise';
import { validateDocumentRules, rulesToDocumentReview } from '@/lib/document/validate-rules';

const MAX_FIX_ITERATIONS = 2;

export interface DocumentPipelineResult {
  content: string;
  review: DocumentReviewResult;
  pipelineLog: AgentStepLog[];
  iterations: number;
  corpusReferenceCount?: number;
}

function mergeReviews(
  ruleReview: AgentReviewResult,
  aiReview: DocumentReviewResult
): DocumentReviewResult {
  const findings = [...ruleReview.findings, ...aiReview.findings];
  const blocking = findings.filter((f) => f.severity === 'bloqueante');
  const score = Math.round((ruleReview.score + aiReview.score) / 2);
  return {
    approved: blocking.length === 0 && score >= 78 && aiReview.approved && ruleReview.approved,
    score,
    findings,
    summary: `Reglas: ${ruleReview.summary} | Revisor IA: ${aiReview.summary}`,
    suggestedPatches: aiReview.suggestedPatches,
  };
}

function pushStep(
  log: AgentStepLog[],
  agent: AgentStepLog['agent'],
  label: string,
  status: AgentStepLog['status'],
  message?: string
) {
  if (status === 'running') {
    log.push({ agent, label, status, startedAt: new Date().toISOString() });
    return;
  }
  const running = [...log].reverse().find((s) => s.agent === agent && s.status === 'running');
  if (running) {
    running.status = status;
    running.finishedAt = new Date().toISOString();
    running.message = message;
  } else {
    log.push({
      agent,
      label,
      status,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      message,
    });
  }
}

function toReviewInput(
  content: string,
  meta: DocumentGenerateInput | DocumentReviewInput
): DocumentReviewInput {
  return {
    docNumber: meta.docNumber,
    docName: meta.docName,
    normRef: meta.normRef,
    companyName: meta.companyName,
    rut: meta.rut,
    size: meta.size,
    content,
  };
}

async function runReviewAndFixLoop(
  meta: DocumentGenerateInput,
  initialContent: string,
  pipelineLog: AgentStepLog[],
  skipFix?: boolean
): Promise<{ content: string; review: DocumentReviewResult; iterations: number }> {
  let content = initialContent;
  let iterations = 0;
  const reviewInput = () => toReviewInput(content, meta);

  while (iterations <= MAX_FIX_ITERATIONS) {
    iterations++;

    const ruleReview = rulesToDocumentReview(
      validateDocumentRules(content, { companyName: meta.companyName, rut: meta.rut })
    );

    pushStep(pipelineLog, 'document-reviewer', `Revisor SST (iter. ${iterations})`, 'running');
    let aiReview: DocumentReviewResult;
    try {
      aiReview = await runDocumentReviewerAgent(reviewInput());
    } catch (e) {
      aiReview = {
        approved: false,
        score: 50,
        findings: [
          {
            id: 'reviewer-fail',
            severity: 'mayor',
            category: 'Sistema',
            message: e instanceof Error ? e.message : 'Revisor no disponible',
          },
        ],
        summary: 'Revisor IA falló; usar solo reglas automáticas.',
      };
    }

    const review = mergeReviews(ruleReview, aiReview);
    pushStep(
      pipelineLog,
      'document-reviewer',
      `Revisor SST (iter. ${iterations})`,
      'done',
      `Score ${review.score}% — ${review.approved ? 'Aprobado' : 'Requiere corrección'}`
    );

    if (review.approved || skipFix) {
      return { content, review, iterations };
    }

    const blocking = review.findings.filter((f) => f.severity === 'bloqueante');
    const needsFix = blocking.length > 0 || review.score < 78;
    if (!needsFix || iterations > MAX_FIX_ITERATIONS) {
      return { content, review, iterations };
    }

    pushStep(pipelineLog, 'document-fixer', `Corrector (iter. ${iterations})`, 'running');
    content = await runDocumentFixerAgent(reviewInput(), review);
    pushStep(pipelineLog, 'document-fixer', `Corrector (iter. ${iterations})`, 'done', 'Markdown actualizado');
  }

  const finalReview = mergeReviews(
    rulesToDocumentReview(validateDocumentRules(content, { companyName: meta.companyName, rut: meta.rut })),
    await runDocumentReviewerAgent(reviewInput()).catch(() => ({
      approved: false,
      score: 60,
      findings: [],
      summary: 'Revisión final omitida por error',
    }))
  );
  return { content, review: finalReview, iterations };
}

/** Genera (opcional) → revisa → corrige Markdown hasta aprobación o máx. iteraciones. */
export async function runDocumentMultiAgentPipeline(
  meta: DocumentGenerateInput,
  opts?: { initialContent?: string; skipFix?: boolean }
): Promise<DocumentPipelineResult> {
  const pipelineLog: AgentStepLog[] = [];
  let content = opts?.initialContent?.trim() ?? '';

  if (!content) {
    pushStep(pipelineLog, 'document-generator', 'Agente generador SST', 'running');
    content = await runDocumentGeneratorAgent(meta);
    pushStep(pipelineLog, 'document-generator', 'Agente generador SST', 'done', `${content.length} caracteres`);
  }

  const { content: finalContent, review, iterations } = await runReviewAndFixLoop(
    meta,
    content,
    pipelineLog,
    opts?.skipFix
  );
  return { content: finalContent, review, pipelineLog, iterations };
}

/**
 * Revisión de documento previo: alinea con el paquete ya creado → revisor → corrector.
 */
export async function runDocumentRevisePipeline(
  meta: DocumentGenerateInput,
  existingContent: string,
  corpusContext: string,
  corpusReferenceCount: number,
  opts?: { skipCorpusRevise?: boolean; skipFix?: boolean }
): Promise<DocumentPipelineResult> {
  const pipelineLog: AgentStepLog[] = [];
  let content = existingContent.trim();

  if (!content) {
    throw new Error('El documento no tiene contenido para revisar');
  }

  if (!opts?.skipCorpusRevise && corpusReferenceCount > 0) {
    pushStep(pipelineLog, 'document-corpus-revise', 'Actualizador vs. paquete documental', 'running');
    content = await runDocumentCorpusReviseAgent(meta, content, corpusContext);
    pushStep(
      pipelineLog,
      'document-corpus-revise',
      'Actualizador vs. paquete documental',
      'done',
      `Alineado con ${corpusReferenceCount} documento(s) de referencia`
    );
  } else if (!opts?.skipCorpusRevise) {
    pushStep(
      pipelineLog,
      'document-corpus-revise',
      'Actualizador vs. paquete documental',
      'skipped',
      'Sin otros documentos de referencia'
    );
  }

  const { content: finalContent, review, iterations } = await runReviewAndFixLoop(
    meta,
    content,
    pipelineLog,
    opts?.skipFix
  );

  return {
    content: finalContent,
    review,
    pipelineLog,
    iterations,
    corpusReferenceCount,
  };
}
