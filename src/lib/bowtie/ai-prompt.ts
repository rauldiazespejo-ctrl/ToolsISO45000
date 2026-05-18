export interface BowtieGenerateInput {
  title: string;
  hazard: string;
  topEvent: string;
  activity?: string;
  area?: string;
  criticality: 'critico' | 'alto';
  context?: string;
  companyName: string;
  rut: string;
  sector?: string;
  workerCount?: number;
  code: string;
}

export function buildBowtieSystemPrompt(): string {
  return `Eres un especialista en gestión de riesgos SST en Chile (DS 44, Ley 16.744, ISO 45001).
Tu tarea es elaborar un análisis Bowtie completo para un RIESGO CRÍTICO o ALTO identificado por el usuario.

Responde ÚNICAMENTE con un bloque JSON válido (sin texto antes ni después) con esta estructura exacta:
{
  "version": "1.0",
  "code": "REG-BOWTIE-XXX",
  "title": "...",
  "hazard": "...",
  "topEvent": "...",
  "activity": "...",
  "area": "...",
  "criticality": "critico" | "alto",
  "normRefs": ["DS 44 Art. 7", "ISO 45001 §6.1", ...],
  "threats": [
    {
      "id": "T1",
      "description": "Amenaza concreta",
      "preventiveBarriers": [
        { "id": "PB1", "name": "Barrera preventiva", "type": "preventivo", "responsible": "...", "effectiveness": "alta|media|baja", "isCritical": true }
      ],
      "escalations": [{ "id": "E1", "factor": "...", "controls": ["..."] }]
    }
  ],
  "consequences": [
    {
      "id": "C1",
      "description": "Consecuencia",
      "severity": "menor|moderado|mayor|catastrofico",
      "recoveryBarriers": [
        { "id": "RB1", "name": "...", "type": "recuperacion", "responsible": "...", "effectiveness": "alta" }
      ]
    }
  ],
  "metadata": {
    "companyName": "...",
    "rut": "...",
    "sector": "...",
    "generatedAt": "ISO-8601",
    "linkedMiperDoc": 7,
    "notes": "..."
  }
}

Reglas:
- Mínimo 2 amenazas y 2 consecuencias para riesgos críticos.
- Mínimo 2 barreras preventivas por amenaza y 2 de recuperación por consecuencia.
- Barreras concretas, auditables (inspección, permiso, capacitación, ingeniería, EPP, procedimiento).
- Terminología Chile: trabajador/a, faena, empleador, MIPER, DS 44.
- Marca isCritical en barreras que si fallan permiten el evento central.`;
}

export function buildBowtieUserPrompt(data: BowtieGenerateInput): string {
  return `Genera el Bowtie codificado para:

Empresa: ${data.companyName} (RUT ${data.rut})
Sector: ${data.sector || 'general'}
Trabajadores: ${data.workerCount ?? 'N/D'}
Código documento: ${data.code}

RIESGO A ANALIZAR:
- Título: ${data.title}
- Peligro: ${data.hazard}
- Evento central (Top Event): ${data.topEvent}
- Actividad/proceso: ${data.activity || 'No especificada'}
- Área/instalación: ${data.area || 'No especificada'}
- Criticidad: ${data.criticality}

Contexto adicional del usuario:
${data.context || 'Sin contexto adicional.'}

Usa "code": "${data.code}" y metadata.companyName/rut exactos. generatedAt en ISO actual.`;
}
