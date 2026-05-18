import type { BowtieModel } from '@/lib/bowtie/types';
import { encodeBowtie } from '@/lib/bowtie/encode';

export function renderBowtieMarkdown(model: BowtieModel): string {
  const lines: string[] = [
    `# Análisis Bowtie — ${model.title}`,
    '',
    `**Código:** ${model.code}  `,
    `**Criticidad:** ${model.criticality.toUpperCase()}  `,
    `**Peligro:** ${model.hazard}  `,
    `**Evento central (Top Event):** ${model.topEvent}  `,
    `**Actividad / proceso:** ${model.activity || '—'}  `,
    `**Área / instalación:** ${model.area || '—'}  `,
    '',
    '## Referencias normativas',
    ...model.normRefs.map((r) => `- ${r}`),
    '',
    '## 1. Descripción del escenario crítico',
    `Este análisis Bowtie documenta un **riesgo ${model.criticality}** identificado en ${model.metadata.companyName}, alineado a la MIPER (documento 7) y al DS 44 / ISO 45001.`,
    '',
    '## 2. Amenazas y barreras preventivas',
  ];

  model.threats.forEach((t, i) => {
    lines.push(`### 2.${i + 1} ${t.description}`, '');
    t.preventiveBarriers.forEach((b, j) => {
      lines.push(
        `${j + 1}. **${b.name}** (${b.type}) — Responsable: ${b.responsible || 'SST'} — Efectividad: ${b.effectiveness || 'media'}${b.isCritical ? ' — *Barrera crítica*' : ''}`
      );
    });
    if (t.escalations?.length) {
      lines.push('', '**Factores de escalamiento y controles:**');
      t.escalations.forEach((e) => {
        lines.push(`- ${e.factor}: ${e.controls.join('; ')}`);
      });
    }
    lines.push('');
  });

  lines.push('## 3. Consecuencias y barreras de recuperación / mitigación');
  model.consequences.forEach((c, i) => {
    lines.push(`### 3.${i + 1} ${c.description} (severidad: ${c.severity})`, '');
    c.recoveryBarriers.forEach((b, j) => {
      lines.push(
        `${j + 1}. **${b.name}** — Responsable: ${b.responsible || 'SST'} — Efectividad: ${b.effectiveness || 'media'}`
      );
    });
    lines.push('');
  });

  lines.push(
    '## 4. Criterios de revisión',
    '- Revisar ante cambios de proceso, incidentes o hallazgos de auditoría.',
    '- Verificar que las barreras críticas tengan indicador de desempeño y responsable asignado.',
    '- Actualizar la MIPER y el mapa de riesgos cuando se modifique este Bowtie.',
    '',
    '## 5. Codificación estructurada (JSON)',
    'El diagrama y este documento se generan desde el modelo codificado siguiente:',
    '',
    '```json',
    encodeBowtie(model),
    '```'
  );

  return lines.join('\n');
}
