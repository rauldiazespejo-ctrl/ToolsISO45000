/** Tipos compartidos del orquestador multiagente TOOLS45000. */

export type AgentRole =
  | 'bowtie-generator'
  | 'bowtie-reviewer'
  | 'bowtie-fixer'
  | 'document-generator'
  | 'document-corpus-revise'
  | 'document-reviewer'
  | 'document-fixer';

export type AgentStepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

export interface AgentStepLog {
  agent: AgentRole;
  label: string;
  status: AgentStepStatus;
  startedAt?: string;
  finishedAt?: string;
  message?: string;
}

export type ReviewSeverity = 'bloqueante' | 'mayor' | 'menor';

export interface ReviewFinding {
  id: string;
  severity: ReviewSeverity;
  category: string;
  message: string;
  suggestion?: string;
}

export interface AgentReviewResult {
  approved: boolean;
  score: number;
  findings: ReviewFinding[];
  summary: string;
}

export interface BowtiePipelineResult {
  model: import('@/lib/bowtie/types').BowtieModel;
  markdown: string;
  svgDiagram: string;
  review: AgentReviewResult;
  pipelineLog: AgentStepLog[];
  iterations: number;
}

export interface DocumentReviewResult {
  approved: boolean;
  score: number;
  findings: ReviewFinding[];
  summary: string;
  suggestedPatches?: { section: string; suggestion: string }[];
}

export interface DocumentPipelineResult {
  content: string;
  review: DocumentReviewResult;
  pipelineLog: AgentStepLog[];
  iterations: number;
}
