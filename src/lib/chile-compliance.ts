export type ChileLegalBody =
  | 'Ley 16.744'
  | 'DS 40'
  | 'DS 54'
  | 'DS 594'
  | 'DS 44'
  | 'Código del Trabajo';

export interface LegalReference {
  body: ChileLegalBody;
  article: string;
  title: string;
  appliesTo: string[];
  version: string;
  effectiveDate?: string;
}

export interface ComplianceEvidence {
  id: string;
  name: string;
  description: string;
  frequency: 'Única' | 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual' | 'Según evento';
  ownerRole: string;
  retention: string;
}

export interface ComplianceObligation {
  id: string;
  topic: string;
  priority: 'Alta' | 'Media' | 'Baja';
  references: LegalReference[];
  requiredEvidence: ComplianceEvidence[];
}

export interface DocumentComplianceTrace {
  documentNumber: number;
  documentName: string;
  legalReferences: LegalReference[];
  requiredEvidence: ComplianceEvidence[];
  minimumAuditCriteria: string[];
}

const CHILE_LEGAL_BASE: LegalReference[] = [
  {
    body: 'Ley 16.744',
    article: 'Marco general',
    title: 'Seguro social contra riesgos de accidentes del trabajo y enfermedades profesionales',
    appliesTo: ['Todos los empleadores', 'Todos los sectores'],
    version: 'Vigente',
  },
  {
    body: 'DS 44',
    article: 'Art. 7',
    title: 'Identificación de peligros y evaluación de riesgos',
    appliesTo: ['Todos los empleadores'],
    version: '2024 + modificaciones vigentes',
  },
  {
    body: 'DS 40',
    article: 'Reglamento',
    title: 'Prevención de riesgos profesionales',
    appliesTo: ['Todos los empleadores'],
    version: 'Vigente',
  },
  {
    body: 'DS 54',
    article: 'Reglamento',
    title: 'Constitución y funcionamiento de Comités Paritarios',
    appliesTo: ['Empresas con obligación de CPHS'],
    version: 'Vigente',
  },
  {
    body: 'DS 594',
    article: 'Condiciones sanitarias y ambientales',
    title: 'Condiciones sanitarias y ambientales básicas en lugares de trabajo',
    appliesTo: ['Todos los centros de trabajo'],
    version: 'Vigente',
  },
  {
    body: 'Código del Trabajo',
    article: 'Deber de protección',
    title: 'Obligaciones laborales relacionadas con SST',
    appliesTo: ['Empleadores y trabajadores'],
    version: 'Vigente',
  },
];

const EVIDENCE_CATALOG: Record<string, ComplianceEvidence> = {
  POLICY_APPROVAL: {
    id: 'EV-GOV-001',
    name: 'Política SST aprobada por Alta Dirección',
    description: 'Documento vigente con firmas y difusión interna verificable.',
    frequency: 'Anual',
    ownerRole: 'Gerencia General / SST',
    retention: '5 años',
  },
  LEGAL_MATRIX: {
    id: 'EV-GOV-002',
    name: 'Matriz de requisitos legales SST actualizada',
    description: 'Matriz con identificación de obligaciones, vigencias y responsables.',
    frequency: 'Trimestral',
    ownerRole: 'SST / Asesoría Legal',
    retention: '5 años',
  },
  RISK_MATRIX: {
    id: 'EV-RSK-001',
    name: 'Matriz IPER/MIPER vigente',
    description: 'Matriz firmada y actualizada con controles y responsables por proceso.',
    frequency: 'Anual',
    ownerRole: 'Encargado SST',
    retention: '5 años',
  },
  TRAINING_LOG: {
    id: 'EV-TRN-001',
    name: 'Registros de capacitación SST',
    description: 'Asistencias, contenidos, evaluaciones y brechas de competencia.',
    frequency: 'Según evento',
    ownerRole: 'RRHH / SST',
    retention: '5 años',
  },
  EPP_DELIVERY: {
    id: 'EV-EPP-001',
    name: 'Registro de entrega y reposición de EPP',
    description: 'Entrega por trabajador con firma, fecha, especificación técnica y reposición.',
    frequency: 'Según evento',
    ownerRole: 'SST / Bodega',
    retention: '5 años',
  },
  CPHS_MINUTES: {
    id: 'EV-PAR-001',
    name: 'Actas y seguimiento del Comité Paritario',
    description: 'Actas firmadas, acuerdos, plazos y estado de cierre.',
    frequency: 'Mensual',
    ownerRole: 'CPHS / SST',
    retention: '5 años',
  },
  HEALTH_SURVEILLANCE: {
    id: 'EV-VIG-001',
    name: 'Registros de vigilancia de salud ocupacional',
    description: 'Protocolos aplicados, exámenes, derivaciones y seguimiento.',
    frequency: 'Según evento',
    ownerRole: 'SST / RRHH / Organismo administrador',
    retention: '10 años',
  },
  EMERGENCY_DRILLS: {
    id: 'EV-EMG-001',
    name: 'Simulacros y pruebas de emergencia',
    description: 'Plan, ejecución, resultados, oportunidades de mejora y evidencia fotográfica.',
    frequency: 'Semestral',
    ownerRole: 'SST / Brigada de emergencia',
    retention: '5 años',
  },
  INCIDENT_INVESTIGATION: {
    id: 'EV-INC-001',
    name: 'Investigación de incidentes y acciones correctivas',
    description: 'Informe causal, acciones, responsables, plazos y verificación de eficacia.',
    frequency: 'Según evento',
    ownerRole: 'SST / Línea de mando',
    retention: '5 años',
  },
  CONTRACTOR_CONTROL: {
    id: 'EV-CTR-001',
    name: 'Control documental de contratistas',
    description: 'Inducción, competencias, permisos, cumplimiento legal y desempeño SST.',
    frequency: 'Mensual',
    ownerRole: 'Abastecimiento / SST',
    retention: '5 años',
  },
  MANAGEMENT_REVIEW: {
    id: 'EV-AUD-001',
    name: 'Revisión por la Dirección y resultados de auditoría',
    description: 'Actas ejecutivas con decisiones, recursos asignados y seguimiento.',
    frequency: 'Anual',
    ownerRole: 'Alta Dirección / SST',
    retention: '5 años',
  },
};

const CATEGORY_COMPLIANCE_MAP: Record<string, { refs: ChileLegalBody[]; evidence: string[]; topic: string; priority: 'Alta' | 'Media' | 'Baja' }> = {
  A: {
    refs: ['Ley 16.744', 'DS 44', 'Código del Trabajo'],
    evidence: ['POLICY_APPROVAL', 'LEGAL_MATRIX', 'MANAGEMENT_REVIEW'],
    topic: 'Fundamentos y gobernanza SST',
    priority: 'Alta',
  },
  B: {
    refs: ['DS 44', 'DS 40', 'Ley 16.744'],
    evidence: ['RISK_MATRIX', 'LEGAL_MATRIX', 'TRAINING_LOG'],
    topic: 'Instrumentos de gestión SST',
    priority: 'Alta',
  },
  C: {
    refs: ['DS 44', 'DS 594', 'Ley 16.744'],
    evidence: ['EPP_DELIVERY', 'RISK_MATRIX', 'TRAINING_LOG', 'CONTRACTOR_CONTROL'],
    topic: 'Operación y control de riesgos',
    priority: 'Alta',
  },
  D: {
    refs: ['DS 54', 'DS 44', 'Código del Trabajo'],
    evidence: ['CPHS_MINUTES', 'TRAINING_LOG', 'MANAGEMENT_REVIEW'],
    topic: 'Participación y organización preventiva',
    priority: 'Alta',
  },
  E: {
    refs: ['DS 44', 'Ley 16.744', 'DS 40'],
    evidence: ['LEGAL_MATRIX', 'POLICY_APPROVAL', 'MANAGEMENT_REVIEW'],
    topic: 'Documentación y control normativo',
    priority: 'Alta',
  },
  F: {
    refs: ['DS 44', 'DS 594', 'Ley 16.744'],
    evidence: ['EMERGENCY_DRILLS', 'TRAINING_LOG', 'RISK_MATRIX'],
    topic: 'Emergencias y continuidad operacional',
    priority: 'Alta',
  },
  G: {
    refs: ['Ley 16.744', 'DS 44', 'DS 594'],
    evidence: ['HEALTH_SURVEILLANCE', 'RISK_MATRIX', 'TRAINING_LOG'],
    topic: 'Vigilancia y salud ocupacional',
    priority: 'Alta',
  },
  H: {
    refs: ['Ley 16.744', 'DS 44', 'DS 40'],
    evidence: ['INCIDENT_INVESTIGATION', 'MANAGEMENT_REVIEW', 'RISK_MATRIX'],
    topic: 'Incidentes, no conformidades y mejora',
    priority: 'Alta',
  },
  I: {
    refs: ['DS 44', 'Código del Trabajo', 'Ley 16.744'],
    evidence: ['TRAINING_LOG', 'RISK_MATRIX', 'CPHS_MINUTES'],
    topic: 'Formación y competencias',
    priority: 'Alta',
  },
  J: {
    refs: ['DS 44', 'Código del Trabajo', 'Ley 16.744'],
    evidence: ['CONTRACTOR_CONTROL', 'TRAINING_LOG', 'LEGAL_MATRIX'],
    topic: 'Comunicación y gestión de contratistas',
    priority: 'Alta',
  },
  K: {
    refs: ['DS 44', 'Ley 16.744', 'DS 40'],
    evidence: ['MANAGEMENT_REVIEW', 'INCIDENT_INVESTIGATION', 'LEGAL_MATRIX'],
    topic: 'Evaluación y mejora del sistema SST',
    priority: 'Alta',
  },
  L: {
    refs: ['DS 44', 'Ley 16.744', 'DS 40', 'DS 54', 'DS 594'],
    evidence: ['LEGAL_MATRIX', 'MANAGEMENT_REVIEW', 'CPHS_MINUTES', 'INCIDENT_INVESTIGATION'],
    topic: 'Fiscalización y preparación inspectiva',
    priority: 'Alta',
  },
};

function getCategoryFromDocumentNumber(documentNumber: number): string {
  if (documentNumber >= 1 && documentNumber <= 6) return 'A';
  if (documentNumber >= 7 && documentNumber <= 11) return 'B';
  if (documentNumber >= 12 && documentNumber <= 19) return 'C';
  if (documentNumber >= 20 && documentNumber <= 24) return 'D';
  if (documentNumber >= 25 && documentNumber <= 27) return 'E';
  if (documentNumber >= 28 && documentNumber <= 30) return 'F';
  if (documentNumber >= 31 && documentNumber <= 32) return 'G';
  if (documentNumber >= 33 && documentNumber <= 35) return 'H';
  if (documentNumber >= 36 && documentNumber <= 37) return 'I';
  if (documentNumber >= 38 && documentNumber <= 40) return 'J';
  if (documentNumber >= 41 && documentNumber <= 44) return 'K';
  if (documentNumber >= 45 && documentNumber <= 46) return 'L';
  return 'A';
}

function resolveReferences(refBodies: ChileLegalBody[]): LegalReference[] {
  return CHILE_LEGAL_BASE.filter((r) => refBodies.includes(r.body));
}

function resolveEvidence(evidenceKeys: string[]): ComplianceEvidence[] {
  return evidenceKeys
    .map((key) => EVIDENCE_CATALOG[key])
    .filter((ev): ev is ComplianceEvidence => Boolean(ev));
}

export function getChileLegalBase(): LegalReference[] {
  return CHILE_LEGAL_BASE;
}

export function getComplianceObligationByDocument(documentNumber: number): ComplianceObligation | null {
  const category = getCategoryFromDocumentNumber(documentNumber);
  const config = CATEGORY_COMPLIANCE_MAP[category];
  if (!config) return null;

  return {
    id: `OB-${category}-${String(documentNumber).padStart(3, '0')}`,
    topic: config.topic,
    priority: config.priority,
    references: resolveReferences(config.refs),
    requiredEvidence: resolveEvidence(config.evidence),
  };
}

export function buildDocumentComplianceTrace(
  documentNumber: number,
  documentName: string,
): DocumentComplianceTrace {
  const obligation = getComplianceObligationByDocument(documentNumber);

  const legalReferences = obligation?.references ?? CHILE_LEGAL_BASE;
  const requiredEvidence = obligation?.requiredEvidence ?? Object.values(EVIDENCE_CATALOG);
  const minimumAuditCriteria = [
    'Incluye sección explícita de base legal aplicable (norma, artículo, versión y vigencia).',
    'Define responsables por cargo, plazos y registros exigibles por cada actividad de control.',
    'Asegura trazabilidad entre riesgos identificados, controles implementados y evidencia documental.',
    'Contiene criterios de aceptación auditables para fiscalización DT/ISL/mutualidad y certificación.',
    'Incorpora control de cambios, historial de revisiones y versión documental vigente.',
    'Registra formalización de aprobación y firma por estructura de cargos definida por la empresa.',
    'Declara tiempos de retención documental y ubicación de respaldo verificable.',
  ];

  return {
    documentNumber,
    documentName,
    legalReferences,
    requiredEvidence,
    minimumAuditCriteria,
  };
}

export function hasMinimumLegalTraceability(content: string): boolean {
  const requiredMarkers = [
    /base legal/i,
    /(DS\s*44|Ley\s*16\.744|DS\s*40|DS\s*54|DS\s*594|Código del Trabajo)/i,
    /(evidencia|criterios de aceptación|trazabilidad)/i,
    /(vigencia|control de cambios|versión)/i,
  ];

  return requiredMarkers.every((regex) => regex.test(content));
}
