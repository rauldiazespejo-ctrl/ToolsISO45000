import type { BowtieModel, BowtieThreat, BowtieConsequence } from '@/lib/bowtie/types';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function wrap(text: string, max = 28): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > max && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

function textBlock(x: number, y: number, lines: string[], size = 11, fill = '#E2E8F0') {
  return lines
    .map(
      (ln, i) =>
        `<text x="${x}" y="${y + i * (size + 3)}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${size}" fill="${fill}">${esc(ln)}</text>`
    )
    .join('');
}

function box(
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  stroke: string,
  label: string,
  sub?: string
) {
  const lines = wrap(label, Math.floor(w / 7));
  const ty = y + h / 2 - ((lines.length - 1) * 7) / 2;
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
    ${textBlock(x + w / 2, ty + 4, lines, 10, '#0F172A')}
    ${sub ? `<text x="${x + w / 2}" y="${y + h - 6}" text-anchor="middle" font-size="8" fill="#64748B">${esc(sub)}</text>` : ''}
  `;
}

function barrierChip(x: number, y: number, name: string, type: 'prev' | 'rec') {
  const w = 88;
  const h = 32;
  const fill = type === 'prev' ? '#DBEAFE' : '#D1FAE5';
  const stroke = type === 'prev' ? '#2563EB' : '#059669';
  return box(x, y, w, h, fill, stroke, name);
}

function renderThreatColumn(threat: BowtieThreat, x: number, y: number): { svg: string; height: number } {
  const barriers = threat.preventiveBarriers.slice(0, 4);
  const blockH = 56 + barriers.length * 38;
  let inner = box(x, y, 140, 52, '#FEF3C7', '#D97706', threat.description, 'Amenaza');
  let cy = y + 58;
  for (const b of barriers) {
    inner += barrierChip(x + 26, cy, b.name, 'prev');
    cy += 38;
  }
  return { svg: inner, height: blockH };
}

function renderConsequenceColumn(c: BowtieConsequence, x: number, y: number): { svg: string; height: number } {
  const barriers = c.recoveryBarriers.slice(0, 4);
  const blockH = 56 + barriers.length * 38;
  let inner = box(x, y, 140, 52, '#FEE2E2', '#DC2626', c.description, `Consec. ${c.severity}`);
  let cy = y + 58;
  for (const b of barriers) {
    inner += barrierChip(x + 26, cy, b.name, 'rec');
    cy += 38;
  }
  return { svg: inner, height: blockH };
}

/** Diagrama Bowtie horizontal (amenazas ← evento central → consecuencias). */
export function renderBowtieSvg(model: BowtieModel): string {
  const W = 1100;
  const centerX = W / 2;
  const topY = 48;
  const rowGap = 24;

  const leftBlocks = model.threats.map((t, i) => {
    let y = topY + 80;
    for (let j = 0; j < i; j++) {
      const prev = model.threats[j]!;
      y += 56 + Math.min(prev.preventiveBarriers.length, 4) * 38 + rowGap;
    }
    return renderThreatColumn(t, 40, y);
  });

  const rightBlocks = model.consequences.map((c, i) => {
    let y = topY + 80;
    for (let j = 0; j < i; j++) {
      const prev = model.consequences[j]!;
      y += 56 + Math.min(prev.recoveryBarriers.length, 4) * 38 + rowGap;
    }
    return renderConsequenceColumn(c, W - 180, y);
  });

  const contentH = Math.max(
    topY + 200,
    ...leftBlocks.map((b, i) => {
      let y = topY + 80;
      for (let j = 0; j < i; j++) {
        const prev = model.threats[j]!;
        y += 56 + Math.min(prev.preventiveBarriers.length, 4) * 38 + rowGap;
      }
      return y + b.height;
    }),
    ...rightBlocks.map((b, i) => {
      let y = topY + 80;
      for (let j = 0; j < i; j++) {
        const prev = model.consequences[j]!;
        y += 56 + Math.min(prev.recoveryBarriers.length, 4) * 38 + rowGap;
      }
      return y + b.height;
    })
  );

  const eventY = topY + 70;
  const eventW = 220;
  const eventH = 72;

  const connectors = model.threats
    .map((_, i) => {
      let y = topY + 80 + 26;
      for (let j = 0; j < i; j++) {
        const prev = model.threats[j]!;
        y += 56 + Math.min(prev.preventiveBarriers.length, 4) * 38 + rowGap;
      }
      return `<line x1="180" y1="${y}" x2="${centerX - eventW / 2}" y2="${eventY + eventH / 2}" stroke="#475569" stroke-width="2" marker-end="url(#arrow)"/>`;
    })
    .join('');

  const connectorsR = model.consequences
    .map((_, i) => {
      let y = topY + 80 + 26;
      for (let j = 0; j < i; j++) {
        const prev = model.consequences[j]!;
        y += 56 + Math.min(prev.recoveryBarriers.length, 4) * 38 + rowGap;
      }
      return `<line x1="${centerX + eventW / 2}" y1="${eventY + eventH / 2}" x2="${W - 180}" y2="${y}" stroke="#475569" stroke-width="2" marker-end="url(#arrow)"/>`;
    })
    .join('');

  const header = `
    <text x="${centerX}" y="28" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="#00D4AA">${esc(model.code)} — ${esc(model.title)}</text>
    <text x="${centerX}" y="46" text-anchor="middle" font-size="10" fill="#94A3B8">Peligro: ${esc(model.hazard)} | Criticidad: ${esc(model.criticality).toUpperCase()}</text>
  `;

  const center = box(
    centerX - eventW / 2,
    eventY,
    eventW,
    eventH,
    '#F97316',
    '#EA580C',
    model.topEvent,
    'Evento central'
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${contentH + 40}" width="${W}" height="${contentH + 40}">
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L8,3 L0,6 Z" fill="#475569"/>
    </marker>
  </defs>
  <rect width="100%" height="100%" fill="#0A1929"/>
  ${header}
  ${leftBlocks.map((b) => b.svg).join('')}
  ${center}
  ${rightBlocks.map((b) => b.svg).join('')}
  ${connectors}
  ${connectorsR}
  <text x="${centerX}" y="${contentH + 24}" text-anchor="middle" font-size="9" fill="#64748B">${esc(model.metadata.companyName)} · ${esc(model.metadata.rut)} · ${esc(model.metadata.generatedAt.slice(0, 10))}</text>
</svg>`;
}
