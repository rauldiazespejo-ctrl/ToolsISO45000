/** Modelo codificado Bowtie v1 — riesgos críticos (Chile / ISO 45001 / DS 44). */
export type BowtieCriticality = 'critico' | 'alto';
export type BowtieSeverity = 'menor' | 'moderado' | 'mayor' | 'catastrofico';
export type BowtieBarrierType = 'preventivo' | 'mitigador' | 'recuperacion';
export type BowtieEffectiveness = 'alta' | 'media' | 'baja';

export interface BowtieBarrier {
  id: string;
  name: string;
  type: BowtieBarrierType;
  responsible?: string;
  effectiveness?: BowtieEffectiveness;
  isCritical?: boolean;
}

export interface BowtieEscalation {
  id: string;
  factor: string;
  controls: string[];
}

export interface BowtieThreat {
  id: string;
  description: string;
  preventiveBarriers: BowtieBarrier[];
  escalations?: BowtieEscalation[];
}

export interface BowtieConsequence {
  id: string;
  description: string;
  severity: BowtieSeverity;
  recoveryBarriers: BowtieBarrier[];
}

export interface BowtieModel {
  version: '1.0';
  code: string;
  title: string;
  hazard: string;
  topEvent: string;
  activity: string;
  area: string;
  criticality: BowtieCriticality;
  normRefs: string[];
  threats: BowtieThreat[];
  consequences: BowtieConsequence[];
  metadata: {
    companyName: string;
    rut: string;
    sector?: string;
    generatedAt: string;
    linkedMiperDoc?: number;
    notes?: string;
  };
}

export interface BowtieAnalysisRecord {
  id: string;
  companyId?: string;
  model: BowtieModel;
  markdown?: string;
  svgDiagram?: string;
  status: 'borrador' | 'generado' | 'aprobado';
  createdAt: string;
  updatedAt: string;
}

export const BOWTIE_DOC_CODE_PREFIX = 'REG-BOWTIE';
