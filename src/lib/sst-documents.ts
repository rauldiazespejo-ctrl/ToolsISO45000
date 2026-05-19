import { SstDocumentItem } from '@/types/sst';
import { buildDocumentComplianceTrace } from '@/lib/chile-compliance';

export const CATEGORIES = [
  { id: 'A', name: 'Fundamentos', color: '#00D4AA' },
  { id: 'B', name: 'Instrumentos de Gestión', color: '#0EA5E9' },
  { id: 'C', name: 'Operación y Control', color: '#F59E0B' },
  { id: 'D', name: 'Participación y Organización', color: '#8B5CF6' },
  { id: 'E', name: 'Documentación y Normativa', color: '#EF4444' },
  { id: 'F', name: 'Emergencias y Continuidad', color: '#F97316' },
  { id: 'G', name: 'Vigilancia y Salud Ocupacional', color: '#14B8A6' },
  { id: 'H', name: 'Incidentes y Mejora', color: '#EC4899' },
  { id: 'I', name: 'Formación y Competencias', color: '#6366F1' },
  { id: 'J', name: 'Comunicación y Contratistas', color: '#84CC16' },
  { id: 'K', name: 'Evaluación y Mejora', color: '#06B6D4' },
  { id: 'L', name: 'Fiscalización', color: '#DC2626' },
];

// Soldesp-style document codes following PRO-HSEQ / REG-SIG / REG-HSEQ scheme
export const DOCUMENT_CODES: Record<number, string> = {
  // Cat A - Fundamentos: REG-SIG-001 to REG-SIG-006
  1: 'REG-SIG-001-CORP', 2: 'REG-SIG-002-CORP', 3: 'REG-SIG-003-CORP',
  4: 'REG-SIG-004-CORP', 5: 'REG-SIG-005-CORP', 6: 'REG-SIG-006-CORP',
  // Cat B - Instrumentos de Gestión: REG-SIG-007 to REG-SIG-011
  7: 'REG-SIG-007-CORP', 8: 'REG-SIG-008-CORP', 9: 'REG-SIG-009-CORP',
  10: 'REG-SIG-010-CORP', 11: 'REG-SIG-011-CORP',
  // Cat C - Operación y Control: PRO-HSEQ-001 to PRO-HSEQ-008
  12: 'PRO-HSEQ-001-CORP', 13: 'PRO-HSEQ-002-CORP', 14: 'PRO-HSEQ-003-CORP',
  15: 'PRO-HSEQ-004-CORP', 16: 'PRO-HSEQ-005-CORP', 17: 'PRO-HSEQ-006-CORP',
  18: 'PRO-HSEQ-007-CORP', 19: 'PRO-HSEQ-008-CORP',
  // Cat D - Participación y Organización: REG-SIG-012 to REG-SIG-016
  20: 'REG-SIG-012-CORP', 21: 'REG-SIG-013-CORP', 22: 'REG-SIG-014-CORP',
  23: 'REG-SIG-015-CORP', 24: 'REG-SIG-016-CORP',
  // Cat E - Documentación y Normativa: PRO-HSEQ-009 to PRO-HSEQ-011
  25: 'PRO-HSEQ-009-CORP', 26: 'PRO-HSEQ-010-CORP', 27: 'PRO-HSEQ-011-CORP',
  // Cat F - Emergencias y Continuidad: PRO-HSEQ-012 to PRO-HSEQ-014
  28: 'PRO-HSEQ-012-CORP', 29: 'PRO-HSEQ-013-CORP', 30: 'PRO-HSEQ-014-CORP',
  // Cat G - Vigilancia y Salud Ocupacional: REG-SIG-017 to REG-SIG-018
  31: 'REG-SIG-017-CORP', 32: 'REG-SIG-018-CORP',
  // Cat H - Incidentes y Mejora: REG-HSEQ-019 to REG-HSEQ-021
  33: 'REG-HSEQ-019-CORP', 34: 'REG-HSEQ-020-CORP', 35: 'REG-HSEQ-021-CORP',
  // Cat I - Formación y Competencias: PRO-HSEQ-015 to PRO-HSEQ-016
  36: 'PRO-HSEQ-015-CORP', 37: 'PRO-HSEQ-016-CORP',
  // Cat J - Comunicación y Contratistas: PRO-HSEQ-017 to PRO-HSEQ-018
  38: 'PRO-HSEQ-017-CORP', 39: 'PRO-HSEQ-018-CORP',
  // Cat K - Evaluación y Mejora: PRO-HSEQ-019 to PRO-HSEQ-023
  40: 'PRO-HSEQ-019-CORP', 41: 'PRO-HSEQ-020-CORP', 42: 'PRO-HSEQ-021-CORP',
  43: 'PRO-HSEQ-022-CORP', 44: 'PRO-HSEQ-023-CORP',
  // Cat L - Fiscalización: REG-HSEQ-024 to REG-HSEQ-025
  45: 'REG-HSEQ-024-CORP', 46: 'REG-HSEQ-025-CORP',
};

// Document type: PROCEDIMIENTO or REGISTRO (for cover page)
export const DOCUMENT_TYPES: Record<number, 'PRO' | 'REG'> = {
  1: 'REG', 2: 'REG', 3: 'REG', 4: 'REG', 5: 'REG', 6: 'REG',
  7: 'REG', 8: 'REG', 9: 'REG', 10: 'REG', 11: 'REG',
  12: 'PRO', 13: 'PRO', 14: 'PRO', 15: 'PRO', 16: 'PRO', 17: 'PRO', 18: 'PRO', 19: 'PRO',
  20: 'REG', 21: 'REG', 22: 'REG', 23: 'REG', 24: 'REG',
  25: 'PRO', 26: 'PRO', 27: 'PRO',
  28: 'PRO', 29: 'PRO', 30: 'PRO',
  31: 'REG', 32: 'REG',
  33: 'REG', 34: 'REG', 35: 'REG',
  36: 'PRO', 37: 'PRO',
  38: 'PRO', 39: 'PRO',
  40: 'PRO', 41: 'PRO', 42: 'PRO', 43: 'PRO', 44: 'PRO',
  45: 'REG', 46: 'REG',
};

const ALL_DOCUMENTS_BASE: SstDocumentItem[] = [
  { number: 1, category: 'A', categoryName: 'Fundamentos', name: 'Determinación del Contexto, Alcance y Partes Interesadas', description: 'Determinar las cuestiones internas y externas pertinentes, identificar las partes interesadas y definir el alcance del SG-SST conforme al DS 44 y la ISO 45001.', responsible: 'Alta Dirección / SST', priority: 'Alta', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 3, 4\nISO 45001 §4.1, 4.2', status: 'Pendiente' },
  { number: 2, category: 'A', categoryName: 'Fundamentos', name: 'Clasificación de la Entidad Empleadora según Tamaño', description: 'Clasificar la empresa en MIPYME (hasta 25 trabajadores), Mediana (26-99) o Gran Empresa (100+). Determina obligaciones específicas en materia preventiva.', responsible: 'SST / RRHH', priority: 'Alta', normSource: 'DS 44', normRef: 'DS 44 Art. 4', status: 'Pendiente' },
  { number: 3, category: 'A', categoryName: 'Fundamentos', name: 'Registro de Trabajadores y Trabajadoras según Tabla de Riesgos', description: 'Identificar y registrar a todos los trabajadores clasificándolos según la tabla de actividades y su nivel de riesgo conforme al DS 44.', responsible: 'SST / RRHH', priority: 'Alta', normSource: 'DS 44', normRef: 'DS 44 Art. 5', status: 'Pendiente' },
  { number: 4, category: 'A', categoryName: 'Fundamentos', name: 'Política de Seguridad y Salud en el Trabajo', description: 'Establecer la política de SST por escrito, firmada por la alta dirección. Incluir compromiso con mejora continua, cumplimiento normativo, enfoque de género y participación de trabajadores.', responsible: 'Alta Dirección', priority: 'Alta', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 22\nISO 45001 §5.2', status: 'Pendiente' },
  { number: 5, category: 'A', categoryName: 'Fundamentos', name: 'Acta de Compromiso y Rendición de Cuentas de la Alta Dirección', description: 'Evidencia documentada de que la alta dirección asume la responsabilidad última por la SST, incluyendo asignación de recursos y liderazgo visible.', responsible: 'Alta Dirección', priority: 'Alta', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 22\nISO 45001 §5.1', status: 'Pendiente' },
  { number: 6, category: 'A', categoryName: 'Fundamentos', name: 'Roles, Responsabilidades y Autoridades en SST', description: 'Definir por escrito las funciones y responsabilidades de todos los actores del SG-SST. Incluir organigrama funcional de SST.', responsible: 'Alta Dirección / SST', priority: 'Alta', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 22\nISO 45001 §5.3', status: 'Pendiente' },
  { number: 7, category: 'B', categoryName: 'Instrumentos de Gestión', name: 'Matriz de Identificación de Peligros y Evaluación de Riesgos (MIPER)', description: 'Elaborar y mantener actualizada la MIPER conforme al Art. 7 del DS 44. Incluir identificación sistemática de peligros, evaluación del riesgo, jerarquía de controles. Actualización anual mínima.', responsible: 'SST / Áreas Operativas', priority: 'Alta', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 7\nISO 45001 §6.1.1', status: 'Pendiente' },
  { number: 8, category: 'B', categoryName: 'Instrumentos de Gestión', name: 'Mapa de Riesgos Laborales', description: 'Elaborar mapas de riesgos gráficos con pictogramas normalizados, ubicación de peligros, zonas de riesgo, equipos de emergencia y rutas de evacuación.', responsible: 'SST / Áreas Operativas', priority: 'Alta', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 62\nISO 45001 §6.1.1', status: 'Pendiente' },
  { number: 9, category: 'B', categoryName: 'Instrumentos de Gestión', name: 'Programa de Trabajo en Prevención de Riesgos Laborales', description: 'Elaborar programa anual preventivo con objetivos medibles, cronograma, responsables, recursos asignados e indicadores de seguimiento.', responsible: 'SST', priority: 'Alta', normSource: 'DS 44', normRef: 'DS 44 Art. 8', status: 'Pendiente' },
  { number: 10, category: 'B', categoryName: 'Instrumentos de Gestión', name: 'Plan de Objetivos de SST e Indicadores de Desempeño', description: 'Definir objetivos medibles de SST. Establecer indicadores proactivos y reactivos: tasa accidentabilidad, índice frecuencia/severidad, cumplimiento capacitaciones.', responsible: 'Alta Dirección / SST', priority: 'Alta', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 22, 64\nISO 45001 §6.1.3', status: 'Pendiente' },
  { number: 11, category: 'B', categoryName: 'Instrumentos de Gestión', name: 'Matriz Legal y Evaluación del Cumplimiento Normativo en SST', description: 'Registro de requisitos legales aplicables: Ley 16.744, DS 44, DS 109, SUSESO, convenios OIT. Evaluaciones periódicas de cumplimiento con brechas y planes de acción.', responsible: 'SST / Asesoría Legal', priority: 'Alta', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 22, 64\nISO 45001 §6.1.2', status: 'Pendiente' },
  { number: 12, category: 'C', categoryName: 'Operación y Control', name: 'Información de los Riesgos Laborales (IRL)', description: 'Proporcionar información completa y oportuna a todos los trabajadores sobre riesgos, medidas de control, procedimientos seguros y uso correcto de EPP.', responsible: 'SST / Supervisión', priority: 'Alta', normSource: 'DS 44', normRef: 'DS 44 Art. 15', status: 'Pendiente' },
  { number: 13, category: 'C', categoryName: 'Operación y Control', name: 'Gestión Preventiva en Máquinas, Equipos y Herramientas Motrices (PMEHM)', description: 'Inventario de máquinas/equipos, evaluación de riesgos, procedimientos de operación segura, mantención preventiva, certificaciones de operadores.', responsible: 'SST / Mantenimiento', priority: 'Alta', normSource: 'DS 44', normRef: 'DS 44 Art. 10', status: 'Pendiente' },
  { number: 14, category: 'C', categoryName: 'Operación y Control', name: 'Programa de Protección Colectiva', description: 'Inventario de protecciones colectivas, guardas de seguridad, barandillas, redes, sistemas de extracción, señalización NCh 1411/4.', responsible: 'SST / Ingeniería', priority: 'Alta', normSource: 'DS 44', normRef: 'DS 44 Art. 12', status: 'Pendiente' },
  { number: 15, category: 'C', categoryName: 'Operación y Control', name: 'Programa de Gestión de Elementos de Protección Personal (EPP)', description: 'Selección de EPP según MIPER, provisión gratuita, registro de entrega firmada, capacitación uso/mantenimiento, programa de reposición.', responsible: 'SST / Logística', priority: 'Alta', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 12, 13\nISO 45001 §8.1.3', status: 'Pendiente' },
  { number: 16, category: 'C', categoryName: 'Operación y Control', name: 'Cartilla Preventiva para Personas Especialmente Sensibles', description: 'Identificar personas especialmente sensibles: embarazadas, lactancia, condiciones preexistentes, menores, discapacidad. Elaborar cartilla con medidas adaptadas.', responsible: 'SST / Médico Ocupacional', priority: 'Alta', normSource: 'DS 44', normRef: 'DS 44 Art. 11', status: 'Pendiente' },
  { number: 17, category: 'C', categoryName: 'Operación y Control', name: 'Perspectiva de Género en la Gestión Preventiva', description: 'Incorporar enfoque de género en gestión preventiva. Considerar diferencias biológicas, sociales y económicas en exposición a riesgos.', responsible: 'SST / RRHH', priority: 'Media', normSource: 'DS 44', normRef: 'DS 44 Art. 9, 53, 54', status: 'Pendiente' },
  { number: 18, category: 'C', categoryName: 'Operación y Control', name: 'Gestión de Cambios Preventiva', description: 'Evaluación de riesgos antes de cambios en procesos, equipos, materiales, organización del trabajo. Comunicación y actualización de MIPER.', responsible: 'SST / Operaciones', priority: 'Media', normSource: 'DS 44', normRef: 'DS 44 Art. 16', status: 'Pendiente' },
  { number: 19, category: 'C', categoryName: 'Operación y Control', name: 'Coordinación entre Entidades Empleadoras en un Mismo Lugar de Trabajo', description: 'Acuerdos de coordinación, intercambio de información sobre riesgos, responsabilidades conjuntas en emergencias, planes para contratistas.', responsible: 'SST / Administración', priority: 'Media', normSource: 'DS 44', normRef: 'DS 44 Art. 14', status: 'Pendiente' },
  { number: 20, category: 'D', categoryName: 'Participación y Organización', name: 'Procedimiento de Consulta y Participación de las Personas Trabajadoras', description: 'Mecanismos formales de consulta y participación en SST: instancias de diálogo, identificación de peligros, toma de decisiones preventivas.', responsible: 'SST / RRHH', priority: 'Alta', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 17\nISO 45001 §5.4', status: 'Pendiente' },
  { number: 21, category: 'D', categoryName: 'Participación y Organización', name: 'Reglamento del Comité Paritario de Higiene y Seguridad (CPHS)', description: 'Constituir CPHS para empresas con más de 25 trabajadores: acta constitución, designación miembros, reglamento interno, reuniones mensuales.', responsible: 'SST / CPHS', priority: 'Alta', normSource: 'DS 44', normRef: 'DS 44 Art. 23 al 49', status: 'Pendiente' },
  { number: 22, category: 'D', categoryName: 'Participación y Organización', name: 'Acta de Elección del Delegado de Seguridad y Salud en el Trabajo', description: 'Empresas con 10-25 trabajadores sin CPHS. Documentar proceso de elección, funciones y atribuciones del delegado.', responsible: 'SST / RRHH', priority: 'Alta', normSource: 'DS 44', normRef: 'DS 44 Art. 66', status: 'Pendiente' },
  { number: 23, category: 'D', categoryName: 'Participación y Organización', name: 'Designación y Capacitación de la Persona Encargada de Prevención', description: 'Designación escrita del encargado de prevención en todas las empresas. Capacitación y competencias conforme normas SUSESO.', responsible: 'Alta Dirección / SST', priority: 'Alta', normSource: 'DS 44', normRef: 'DS 44 Art. 65', status: 'Pendiente' },
  { number: 24, category: 'D', categoryName: 'Participación y Organización', name: 'Departamento de Prevención de Riesgos (Empresas ≥ 100 trabajadores)', description: 'Constituir DPR para empresas 100+ trabajadores con profesionales expertos, recursos suficientes y dependencia directa de alta dirección.', responsible: 'Alta Dirección / SST', priority: 'Alta', normSource: 'DS 44', normRef: 'DS 44 Art. 22, 64', status: 'Pendiente' },
  { number: 25, category: 'E', categoryName: 'Documentación y Normativa', name: 'Reglamento Interno de Orden, Higiene y Seguridad (RIOHS)', description: 'Obligaciones empleador/trabajadores, medidas control riesgos, uso EPP, normas higiene, procedimientos emergencia, sanciones. Entrega con acuse recibo.', responsible: 'SST / RRHH / Legal', priority: 'Alta', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 56 a 61\nISO 45001 §7.5', status: 'Pendiente' },
  { number: 26, category: 'E', categoryName: 'Documentación y Normativa', name: 'Lista Maestra de Documentos del SG-SST', description: 'Inventario de toda la información documentada: código, título, versión, fecha emisión, responsable y estado de cada documento.', responsible: 'SST / Calidad', priority: 'Media', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 64\nISO 45001 §7.5', status: 'Pendiente' },
  { number: 27, category: 'E', categoryName: 'Documentación y Normativa', name: 'Procedimiento de Control de Registros Documentales', description: 'Gestión de registros: creación controlada, legibilidad, trazabilidad, almacenamiento, protección datos, tiempos retención Ley 16.744.', responsible: 'SST / Calidad', priority: 'Media', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 64\nISO 45001 §7.5.2', status: 'Pendiente' },
  { number: 28, category: 'F', categoryName: 'Emergencias y Continuidad', name: 'Procedimiento de Actuación Frente a Riesgos Graves e Inminentes', description: 'Criterios de identificación, autoridad para paralización, protocolos evacuación, protección de trabajadores, reinspección antes de reiniciar.', responsible: 'SST / Brigadas', priority: 'Alta', normSource: 'DS 44', normRef: 'DS 44 Art. 18', status: 'Pendiente' },
  { number: 29, category: 'F', categoryName: 'Emergencias y Continuidad', name: 'Plan de Gestión del Riesgo de Desastres (GRD)', description: 'Análisis amenazas naturales/antrópicas, plan emergencia/contingencia, continuidad operativa, brigadas, alerta temprana, coordinación ONEMI/bomberos.', responsible: 'SST / Gerencia General', priority: 'Alta', normSource: 'DS 44', normRef: 'DS 44 Art. 19', status: 'Pendiente' },
  { number: 30, category: 'F', categoryName: 'Emergencias y Continuidad', name: 'Registros de Simulacros y Ejercicios de Emergencia', description: 'Plan del simulacro, participantes, tiempos evacuación, evaluación desempeño, lecciones aprendidas, frecuencia mínima anual.', responsible: 'SST / Brigadas', priority: 'Alta', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 19\nISO 45001 §8.2', status: 'Pendiente' },
  { number: 31, category: 'G', categoryName: 'Vigilancia y Salud Ocupacional', name: 'Programa de Vigilancia Ambiental', description: 'Mediciones periódicas: ruido, iluminación, vibraciones, polvos, gases, vapores, temperatura. Evaluación ergonómica y psicosocial. Límites ISP.', responsible: 'SST / Médico Ocupacional', priority: 'Alta', normSource: 'DS 44', normRef: 'DS 44 Ley 16.744', status: 'Pendiente' },
  { number: 32, category: 'G', categoryName: 'Vigilancia y Salud Ocupacional', name: 'Programa de Vigilancia de la Salud de los Trabajadores', description: 'Exámenes médicos ocupacionales (ingreso, periódicos, retiro), monitoreo biológico, historia clínica ocupacional, enfermedades profesionales.', responsible: 'Médico Ocupacional / SST', priority: 'Alta', normSource: 'DS 44', normRef: 'DS 44 Ley 16.744', status: 'Pendiente' },
  { number: 33, category: 'H', categoryName: 'Incidentes y Mejora', name: 'Procedimiento de Reporte y Registro de Incidentes y Sucesos Peligrosos', description: 'Formulario de reporte, plazos notificación (DENUNIA, mutualidad, ISL, DT), clasificación de eventos y registro estadístico.', responsible: 'SST / Supervisión', priority: 'Alta', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 71\nISO 45001 §10.1', status: 'Pendiente' },
  { number: 34, category: 'H', categoryName: 'Incidentes y Mejora', name: 'Procedimiento de Investigación de Siniestros (Metodología Árbol de Causas)', description: 'Recopilación información preliminar (Anexo 1), análisis causas inmediatas/básicas, informe (Anexo 4), medidas correctivas (Anexo 5).', responsible: 'SST / CPHS', priority: 'Alta', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 71\nISO 45001 §10.2', status: 'Pendiente' },
  { number: 35, category: 'H', categoryName: 'Incidentes y Mejora', name: 'Estadísticas de Accidentabilidad e Indicadores de SST', description: 'Tasa accidentabilidad, índice frecuencia/severidad/incidencia, días perdidos/cargados, formatos SUSESO, benchmarks sectoriales.', responsible: 'SST', priority: 'Alta', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 71\nISO 45001 §9.1.1', status: 'Pendiente' },
  { number: 36, category: 'I', categoryName: 'Formación y Competencias', name: 'Plan de Formación y Capacitación en SST', description: 'Inducción general, capacitación específica por puesto, formación CPHS/delegados, emergencias, simulacros. Mínimo 2 horas/año/trabajador.', responsible: 'SST / RRHH', priority: 'Alta', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 21\nISO 45001 §7.2, 7.3', status: 'Pendiente' },
  { number: 37, category: 'I', categoryName: 'Formación y Competencias', name: 'Registro de Competencias en SST del Personal Preventivo', description: 'Competencias, formación, certificaciones del personal preventivo: encargado, delegados, CPHS, DPR. Requisitos SUSESO.', responsible: 'SST / RRHH', priority: 'Alta', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 65, 66\nISO 45001 §7.2', status: 'Pendiente' },
  { number: 38, category: 'J', categoryName: 'Comunicación y Contratistas', name: 'Procedimiento de Comunicación Interna y Externa en SST', description: 'Canales internos (cartas, correos, afiches, reuniones) y externos (mutualidades, ISL, DT, SUSESO). Puntos información accesibles.', responsible: 'SST / Comunicaciones', priority: 'Media', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 20\nISO 45001 §7.4', status: 'Pendiente' },
  { number: 39, category: 'J', categoryName: 'Comunicación y Contratistas', name: 'Procedimiento de Gestión de Contratistas en SST', description: 'Evaluación competencias SST contratistas, requisitos contractuales preventivos, coordinación actividades, supervisiones conjuntas.', responsible: 'Compras / SST', priority: 'Media', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 14\nISO 45001 §8.1.4', status: 'Pendiente' },
  { number: 40, category: 'K', categoryName: 'Evaluación y Mejora', name: 'Procedimiento de Auditoría Interna del SG-SST', description: 'Programa auditorías anuales, criterios y alcance, competencias auditores, listas verificación FUF, informes, no conformidades.', responsible: 'SST / Calidad', priority: 'Alta', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 64\nISO 45001 §9.2', status: 'Pendiente' },
  { number: 41, category: 'K', categoryName: 'Evaluación y Mejora', name: 'Actas de Revisión por la Dirección en SST', description: 'Análisis indicadores, resultados auditorías, cumplimiento normativo, acciones correctivas, cambios condiciones, necesidades recursos.', responsible: 'Alta Dirección / SST', priority: 'Alta', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 64\nISO 45001 §9.3', status: 'Pendiente' },
  { number: 42, category: 'K', categoryName: 'Evaluación y Mejora', name: 'Registro de No Conformidades y Acciones Correctivas', description: 'Identificación NC, análisis causa raíz, acciones correctivas inmediatas/largo plazo, verificación eficacia, cierre formal.', responsible: 'SST / Calidad', priority: 'Alta', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 64\nISO 45001 §10.1', status: 'Pendiente' },
  { number: 43, category: 'K', categoryName: 'Evaluación y Mejora', name: 'Programa de Mejora Continua en SST', description: 'Iniciativas de mejora basadas en evaluación desempeño, revisiones dirección, retroalimentación trabajadores, lecciones aprendidas.', responsible: 'SST / Alta Dirección', priority: 'Media', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 64\nISO 45001 §10.2', status: 'Pendiente' },
  { number: 44, category: 'K', categoryName: 'Evaluación y Mejora', name: 'Registro Documental de la Gestión Preventiva', description: 'Registro integrado de inspecciones, capacitaciones, entregas EPP, actas CPHS, informes vigilancia, estadísticas accidentabilidad.', responsible: 'SST', priority: 'Alta', normSource: 'DS 44 + ISO 45001', normRef: 'DS 44 Art. 64\nISO 45001 §10.2', status: 'Pendiente' },
  { number: 45, category: 'L', categoryName: 'Fiscalización', name: 'Formulario Único de Fiscalización (FUF DS 44) — Autoevaluación', description: 'Autoevaluación para verificar cumplimiento normativo antes de fiscalizaciones ISL/DT: estructura preventiva, instrumentos, participación, vigilancia.', responsible: 'SST / Gerencia General', priority: 'Alta', normSource: 'DS 44', normRef: 'DS 44 Art. 72 y ss.', status: 'Pendiente' },
  { number: 46, category: 'L', categoryName: 'Fiscalización', name: 'Plan de Preparación para Fiscalizaciones del DS 44', description: 'Verificación previa cumplimiento, organización documentación, simulacros auditoría, designación acompañantes, plan atención observaciones.', responsible: 'SST / Gerencia General', priority: 'Alta', normSource: 'DS 44', normRef: 'DS 44 Art. 72 y ss.', status: 'Pendiente' },
];

export const ALL_DOCUMENTS: SstDocumentItem[] = ALL_DOCUMENTS_BASE.map((doc) => {
  const trace = buildDocumentComplianceTrace(doc.number, doc.name);

  return {
    ...doc,
    complianceTrace: {
      legalReferences: trace.legalReferences.map((ref) => ({
        body: ref.body,
        article: ref.article,
        title: ref.title,
        version: ref.version,
        effectiveDate: ref.effectiveDate,
      })),
      requiredEvidence: trace.requiredEvidence.map((ev) => ({
        id: ev.id,
        name: ev.name,
        frequency: ev.frequency,
        ownerRole: ev.ownerRole,
        retention: ev.retention,
      })),
      minimumAuditCriteria: trace.minimumAuditCriteria,
    },
  };
});
