import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  AlignmentType,
  BorderStyle,
  WidthType,
  PageBreak,
  ShadingType,
  VerticalAlign,
  PageNumber,
  LevelFormat,
  HeadingLevel,
  ImageRun,
} from 'docx';
import { CLIENT_LOGO_BASENAME, getUploadsDir } from '@/lib/upload-paths';
import { APP_PRODUCT_NAME } from '@/lib/product-brand';
import {
  decodeLogoDataUrl,
  extractPaletteFromBuffer,
  paletteToDocxColors,
  PULSO_DEFAULT_PALETTE,
  type DocBrandPalette,
} from '@/lib/brand-colors';
import { renderSignaturePng } from '@/lib/signature-render';
import type { CompanySignatories, SignatoryConfig } from '@/types/sst';

// Colores mutables por solicitud (se restauran al finalizar cada POST)
const C = {
  ...paletteToDocxColors(PULSO_DEFAULT_PALETTE),
  accent: PULSO_DEFAULT_PALETTE.accent,
};

function resetDocColors() {
  Object.assign(C, {
    ...paletteToDocxColors(PULSO_DEFAULT_PALETTE),
    accent: PULSO_DEFAULT_PALETTE.accent,
  });
}

async function applyBrandToDocColors(
  brandPalette: DocBrandPalette | undefined,
  logoBuf: Buffer | null
) {
  let palette = brandPalette;
  if (!palette && logoBuf) {
    palette = await extractPaletteFromBuffer(logoBuf);
  }
  if (palette) {
    Object.assign(C, {
      ...paletteToDocxColors(palette),
      accent: palette.accent,
    });
  }
}

const PRODUCT_DOC_BRAND = APP_PRODUCT_NAME;

function detectRasterFormat(buf: Buffer): 'png' | 'jpg' {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  return 'png';
}

function noBorderCellBorders() {
  return {
    top: { style: BorderStyle.NONE, size: 0, color: C.white },
    bottom: { style: BorderStyle.NONE, size: 0, color: C.white },
    left: { style: BorderStyle.NONE, size: 0, color: C.white },
    right: { style: BorderStyle.NONE, size: 0, color: C.white },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function isProcedure(code: string): boolean {
  return code.startsWith('PRO-');
}

function docTypeLabel(code: string): string {
  return isProcedure(code) ? 'PROCEDIMIENTO' : 'REGISTRO';
}

function cell(
  text: string,
  opts: {
    bold?: boolean;
    shading?: string;
    textColor?: string;
    width?: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    vAlign?: (typeof VerticalAlign)[keyof typeof VerticalAlign];
    fontSize?: number;
    colSpan?: number;
    rowSpan?: number;
    children?: Paragraph[];
    noBorders?: boolean;
  } = {}
): TableCell {
  const {
    bold = false,
    shading,
    textColor = C.textDark,
    width,
    align = AlignmentType.LEFT,
    vAlign = VerticalAlign.CENTER,
    fontSize = 22, // 11pt
    colSpan,
    rowSpan,
    children,
    noBorders = false,
  } = opts;

  const borders = noBorders
    ? {
        top: { style: BorderStyle.NONE, size: 0, color: C.white },
        bottom: { style: BorderStyle.NONE, size: 0, color: C.white },
        left: { style: BorderStyle.NONE, size: 0, color: C.white },
        right: { style: BorderStyle.NONE, size: 0, color: C.white },
      }
    : {
        top: { style: BorderStyle.SINGLE, size: 1, color: C.tableBorder },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: C.tableBorder },
        left: { style: BorderStyle.SINGLE, size: 1, color: C.tableBorder },
        right: { style: BorderStyle.SINGLE, size: 1, color: C.tableBorder },
      };

  const o: any = {
    children:
      children ||
      [
        new Paragraph({
          alignment: align,
          spacing: { before: 40, after: 40 },
          children: [
            new TextRun({ text, bold, color: textColor, size: fontSize, font: 'Calibri' }),
          ],
        }),
      ],
    verticalAlign: vAlign,
    borders,
  };

  if (width) o.width = { size: width, type: WidthType.PERCENTAGE };
  if (shading) o.shading = { type: ShadingType.SOLID, color: shading };
  if (colSpan) o.columnSpan = colSpan;
  if (rowSpan) o.rowSpan = rowSpan;
  return new TableCell(o);
}

// ─── Markdown → docx paragraphs ─────────────────────────────────────────────
function mdToDocx(md: string): Paragraph[] {
  const lines = md.split('\n');
  const out: Paragraph[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];

    // skip table delimiters
    if (/^\|[\s\-:|]+\|$/.test(raw)) continue;

    // tables — we emit them as inline text blocks (simple approach)
    if (raw.startsWith('|') && raw.endsWith('|')) {
      const cells = raw
        .split('|')
        .filter((c) => c.trim())
        .map((c) => c.trim());
      const isFirstRow = i === 0 || /^\|[\s\-:|]+\|$/.test(lines[i - 1] || '');

      // For now, render table rows as tabbed paragraphs
      out.push(
        new Paragraph({
          spacing: { before: 60, after: 60 },
          indent: { left: 360 },
          children: cells.map(
            (c, idx) =>
              new TextRun({
                text: (idx > 0 ? '  |  ' : '') + c,
                bold: isFirstRow,
                color: C.textDark,
                size: 20,
                font: 'Calibri',
              })
          ),
        })
      );
      continue;
    }

    if (raw.trim() === '') continue;

    // ### heading 3
    if (raw.startsWith('### ')) {
      out.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: raw.replace('### ', '').trim(),
              bold: true,
              color: C.navy,
              size: 24,
              font: 'Calibri',
            }),
          ],
        })
      );
      continue;
    }

    // ## heading 2
    if (raw.startsWith('## ')) {
      out.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 120 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 2, color: C.turquoise, space: 4 },
          },
          children: [
            new TextRun({
              text: raw.replace('## ', '').trim(),
              bold: true,
              color: C.navy,
              size: 28,
              font: 'Calibri',
            }),
          ],
        })
      );
      continue;
    }

    // # heading 1 — skip (handled by cover)
    if (raw.startsWith('# ')) continue;

    // Bold inline **text**
    const boldParts: TextRun[] = [];
    const re = /\*\*(.*?)\*\*/g;
    let last = 0;
    let m;
    let hasBold = false;
    while ((m = re.exec(raw)) !== null) {
      hasBold = true;
      if (m.index > last)
        boldParts.push(tr(raw.slice(last, m.index)));
      boldParts.push(tr(m[1], true));
      last = m.index + m[0].length;
    }
    if (last < raw.length) boldParts.push(tr(raw.slice(last)));

    // Bullet / numbered list
    if (/^[\-\*]\s/.test(raw) || /^\d+\.\s/.test(raw)) {
      const txt = raw.replace(/^[\-\*]\s/, '').replace(/^\d+\.\s/, '');
      const parts = inlineBold(txt);
      out.push(
        new Paragraph({
          spacing: { before: 40, after: 40 },
          indent: { left: 720 },
          children: [
            new TextRun({ text: '• ', color: C.turquoise, size: 20, font: 'Calibri' }),
            ...parts,
          ],
        })
      );
      continue;
    }

    // Normal paragraph
    out.push(
      new Paragraph({
        spacing: { before: 80, after: 80 },
        children: hasBold ? boldParts : [tr(raw)],
      })
    );
  }

  return out;
}

function tr(text: string, bold = false): TextRun {
  return new TextRun({ text, bold, color: C.textDark, size: 22, font: 'Calibri' });
}

function signatureImageCell(imageBuf: Buffer, colSpan: number): TableCell {
  const borders = {
    top: { style: BorderStyle.SINGLE, size: 1, color: C.tableBorder },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: C.tableBorder },
    left: { style: BorderStyle.SINGLE, size: 1, color: C.tableBorder },
    right: { style: BorderStyle.SINGLE, size: 1, color: C.tableBorder },
  };
  return new TableCell({
    columnSpan: colSpan,
    verticalAlign: VerticalAlign.CENTER,
    borders,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 40 },
        children: [
          new ImageRun({
            data: imageBuf,
            type: 'png',
            transformation: { width: 220, height: 62 },
          }),
        ],
      }),
    ],
  });
}

async function renderSignatoryBlock(
  signatory: SignatoryConfig | undefined,
  auditSeed: string
): Promise<Buffer | null> {
  if (!signatory?.fullName?.trim()) return null;
  const { buffer } = await renderSignaturePng({
    fullName: signatory.fullName,
    initials: signatory.initials,
    styleId: signatory.styleId,
    auditSeed,
  });
  return buffer;
}

function inlineBold(text: string): TextRun[] {
  const parts: TextRun[] = [];
  const re = /\*\*(.*?)\*\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(tr(text.slice(last, m.index)));
    parts.push(tr(m[1], true));
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(tr(text.slice(last)));
  return parts;
}

// ─── API handler ─────────────────────────────────────────────────────────────
interface ReqBody {
  content: string;
  docName: string;
  docCode: string;
  companyName: string;
  rut: string;
  version?: number;
  brandingMode?: 'pulso' | 'soldesp' | 'both';
  clientLogoPath?: string;
  brandPalette?: DocBrandPalette;
  signatories?: CompanySignatories;
  companyId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ReqBody;
    const {
      content,
      docName,
      docCode,
      companyName,
      rut,
      version = 1,
      brandingMode = 'pulso',
      clientLogoPath,
      brandPalette,
      signatories,
      companyId,
    } = body;

    if (!content || !docName || !docCode || !companyName) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos: content, docName, docCode, companyName' },
        { status: 400 }
      );
    }

    const isPro = isProcedure(docCode);
    const typeLabel = docTypeLabel(docCode);
    const today = new Date().toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const todayShort = new Date().toLocaleDateString('es-CL');

    let clientLogoBuf: Buffer | null = decodeLogoDataUrl(clientLogoPath);
    if (!clientLogoBuf && (brandingMode === 'soldesp' || brandingMode === 'both')) {
      const uploadsFile = path.join(getUploadsDir(), CLIENT_LOGO_BASENAME);
      const legacyPublic = path.join(process.cwd(), 'public', CLIENT_LOGO_BASENAME);
      if (existsSync(uploadsFile)) clientLogoBuf = readFileSync(uploadsFile);
      else if (existsSync(legacyPublic)) clientLogoBuf = readFileSync(legacyPublic);
    }

    await applyBrandToDocColors(brandPalette, clientLogoBuf);

    const showClientImage =
      clientLogoBuf !== null && (brandingMode === 'soldesp' || brandingMode === 'both');
    const showProductBrand = brandingMode === 'pulso' || brandingMode === 'both';

    const leftLogoCell = showClientImage
      ? new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          borders: noBorderCellBorders(),
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { before: 40, after: 40 },
              children: [
                new ImageRun({
                  data: clientLogoBuf!,
                  type: detectRasterFormat(clientLogoBuf!),
                  transformation: { width: 200, height: 100 },
                }),
              ],
            }),
          ],
        })
      : cell(companyName.toUpperCase(), {
          bold: true,
          fontSize: 20,
          textColor: C.navy,
          align: AlignmentType.LEFT,
          width: 50,
          noBorders: true,
        });

    const rightLogoCell = showProductBrand
      ? cell(PRODUCT_DOC_BRAND, {
          bold: true,
          fontSize: 20,
          textColor: C.navy,
          align: AlignmentType.RIGHT,
          width: 50,
          noBorders: true,
        })
      : cell('', {
          width: 50,
          noBorders: true,
          align: AlignmentType.RIGHT,
        });

    const logoRow = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: [leftLogoCell, rightLogoCell] })],
    });

    const seedBase = companyId || rut || companyName;
    const elaborado = signatories?.elaborado;
    const revisado = signatories?.revisado;
    const aprobado = signatories?.aprobado;

    const [sigElab, sigRev, sigAprob] = await Promise.all([
      renderSignatoryBlock(elaborado, `${seedBase}|ELABORADO`),
      renderSignatoryBlock(revisado, `${seedBase}|REVISADO`),
      renderSignatoryBlock(aprobado, `${seedBase}|APROBADO`),
    ]);

    const firmaCell = (buf: Buffer | null, colSpan: number) =>
      buf
        ? signatureImageCell(buf, colSpan)
        : cell('—', { colSpan, align: AlignmentType.CENTER, fontSize: 18 });

    // Formalización (Elaborado 3 cols, Revisado 3, Aprobado 4)
    const formalTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            cell('ELABORADO', {
              bold: true,
              shading: C.turquoise,
              textColor: C.white,
              fontSize: 18,
              align: AlignmentType.CENTER,
              colSpan: 3,
            }),
            cell('REVISADO', {
              bold: true,
              shading: C.turquoise,
              textColor: C.white,
              fontSize: 18,
              align: AlignmentType.CENTER,
              colSpan: 3,
            }),
            cell('APROBADO', {
              bold: true,
              shading: C.turquoise,
              textColor: C.white,
              fontSize: 18,
              align: AlignmentType.CENTER,
              colSpan: 4,
            }),
          ],
        }),
        new TableRow({
          children: [
            cell('Nombre', { bold: true, shading: C.lightGray, fontSize: 18, width: 10 }),
            cell(elaborado?.fullName || '—', { colSpan: 2, fontSize: 18 }),
            cell('Nombre', { bold: true, shading: C.lightGray, fontSize: 18, width: 10 }),
            cell(revisado?.fullName || '—', { colSpan: 2, fontSize: 18 }),
            cell('Nombre', { bold: true, shading: C.lightGray, fontSize: 18, width: 10 }),
            cell(aprobado?.fullName || '—', { colSpan: 3, fontSize: 18 }),
          ],
        }),
        new TableRow({
          children: [
            cell('Cargo', { bold: true, shading: C.lightGray, fontSize: 18, width: 10 }),
            cell(elaborado?.jobTitle || '—', { colSpan: 2, fontSize: 18 }),
            cell('Cargo', { bold: true, shading: C.lightGray, fontSize: 18, width: 10 }),
            cell(revisado?.jobTitle || '—', { colSpan: 2, fontSize: 18 }),
            cell('Cargo', { bold: true, shading: C.lightGray, fontSize: 18, width: 10 }),
            cell(aprobado?.jobTitle || '—', { colSpan: 3, fontSize: 18 }),
          ],
        }),
        new TableRow({
          children: [
            cell('Firma', { bold: true, shading: C.lightGray, fontSize: 18, width: 10 }),
            firmaCell(sigElab, 2),
            cell('Firma', { bold: true, shading: C.lightGray, fontSize: 18, width: 10 }),
            firmaCell(sigRev, 2),
            cell('Firma', { bold: true, shading: C.lightGray, fontSize: 18, width: 10 }),
            firmaCell(sigAprob, 3),
          ],
        }),
        new TableRow({
          children: [
            cell('Fecha', { bold: true, shading: C.lightGray, fontSize: 18, width: 10 }),
            cell(todayShort, { colSpan: 2, align: AlignmentType.CENTER, fontSize: 18 }),
            cell('Fecha', { bold: true, shading: C.lightGray, fontSize: 18, width: 10 }),
            cell(todayShort, { colSpan: 2, align: AlignmentType.CENTER, fontSize: 18 }),
            cell('Fecha', { bold: true, shading: C.lightGray, fontSize: 18, width: 10 }),
            cell(todayShort, { colSpan: 3, align: AlignmentType.CENTER, fontSize: 18 }),
          ],
        }),
      ],
    });

    const coverPage = [
      // Spacers to push content down
      ...Array.from({ length: 2 }, () => new Paragraph({ spacing: { before: 200 }, children: [] })),

      // Logo row
      logoRow,

      // Accent line
      new Paragraph({
        spacing: { before: 300, after: 200 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: C.turquoise, space: 8 },
        },
        children: [],
      }),

      // Document type label
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 80 },
        children: [
          new TextRun({
            text: 'SISTEMA INTEGRADO DE GESTIÓN',
            bold: true,
            color: C.turquoise,
            size: 28,
            font: 'Calibri',
          }),
        ],
      }),

      // PROCEDIMIENTO or REGISTRO
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 80 },
        children: [
          new TextRun({
            text: typeLabel,
            bold: true,
            color: C.navy,
            size: 44,
            font: 'Calibri',
          }),
        ],
      }),

      // Document title
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 80 },
        children: [
          new TextRun({
            text: docName.toUpperCase(),
            bold: true,
            color: C.navy,
            size: 32,
            font: 'Calibri',
          }),
        ],
      }),

      // Document code
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, after: 200 },
        children: [
          new TextRun({
            text: docCode,
            bold: true,
            color: C.turquoise,
            size: 28,
            font: 'Calibri',
          }),
        ],
      }),

      // Version
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 300 },
        children: [
          new TextRun({
            text: `Revisión: ${version}`,
            color: C.textMedium,
            size: 22,
            font: 'Calibri',
          }),
        ],
      }),

      // Formalización table
      formalTable,

      // Page break
      new Paragraph({ children: [new PageBreak()] }),
    ];

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 2+ — INDEX + CONTENT
    // ─────────────────────────────────────────────────────────────────────────

    // Extract section headings from markdown for INDEX
    const sectionHeadings: string[] = [];
    const contentLines = content.split('\n');
    for (const line of contentLines) {
      if (line.startsWith('## ')) {
        sectionHeadings.push(line.replace('## ', '').trim());
      } else if (line.startsWith('### ')) {
        sectionHeadings.push(line.replace('### ', '').trim());
      }
    }

    // Build INDEX section
    const indexSection: Paragraph[] = [
      new Paragraph({
        spacing: { before: 200, after: 200 },
        children: [
          new TextRun({
            text: 'ÍNDICE',
            bold: true,
            color: C.navy,
            size: 36,
            font: 'Calibri',
          }),
        ],
      }),
      new Paragraph({
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 3, color: C.turquoise, space: 6 },
        },
        spacing: { after: 200 },
        children: [],
      }),
    ];

    sectionHeadings.forEach((heading, idx) => {
      indexSection.push(
        new Paragraph({
          spacing: { before: 80, after: 80 },
          tabStops: [
            {
              type: 'right',
              position: 8500,
            },
          ],
          children: [
            new TextRun({
              text: `${idx + 1}. ${heading}`,
              color: C.textDark,
              size: 22,
              font: 'Calibri',
            }),
          ],
        })
      );
    });

    // Modifications table (empty for new document)
    const modTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            cell('N°', { bold: true, shading: C.turquoise, textColor: C.white, fontSize: 20, align: AlignmentType.CENTER, width: 10 }),
            cell('FECHA', { bold: true, shading: C.turquoise, textColor: C.white, fontSize: 20, align: AlignmentType.CENTER, width: 25 }),
            cell('DESCRIPCIÓN DE LA MODIFICACIÓN', { bold: true, shading: C.turquoise, textColor: C.white, fontSize: 20, align: AlignmentType.CENTER, width: 50 }),
            cell('PÁGINA', { bold: true, shading: C.turquoise, textColor: C.white, fontSize: 20, align: AlignmentType.CENTER, width: 15 }),
          ],
        }),
        new TableRow({
          children: [
            cell('1', { fontSize: 20, align: AlignmentType.CENTER, width: 10 }),
            cell(todayShort, { fontSize: 20, align: AlignmentType.CENTER, width: 25 }),
            cell('Emisión inicial del documento', { fontSize: 20, width: 50 }),
            cell('Todas', { fontSize: 20, align: AlignmentType.CENTER, width: 15 }),
          ],
        }),
      ],
    });

    // Parse markdown content into paragraphs
    const contentParagraphs = mdToDocx(content);

    const contentSection = [
      // Modifications section
      new Paragraph({
        spacing: { before: 200, after: 120 },
        children: [
          new TextRun({
            text: '1. MODIFICACIONES',
            bold: true,
            color: C.navy,
            size: 28,
            font: 'Calibri',
          }),
        ],
      }),
      modTable,
      new Paragraph({ spacing: { before: 100, after: 100 }, children: [] }),
      ...contentParagraphs,
    ];

    // ─────────────────────────────────────────────────────────────────────────
    // BUILD DOCUMENT
    // ─────────────────────────────────────────────────────────────────────────

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: 'Calibri',
              size: 22,
              color: C.textDark,
            },
          },
        },
      },
      numbering: {
        config: [
          {
            reference: 'default-numbering',
            levels: [
              {
                level: 0,
                format: LevelFormat.BULLET,
                text: '\u2022',
                alignment: AlignmentType.LEFT,
                style: {
                  paragraph: {
                    indent: { left: 720, hanging: 360 },
                  },
                },
              },
            ],
          },
        ],
      },
      sections: [
        {
          // ── Cover Page Section (no header/footer) ──
          properties: {
            page: {
              margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 },
            },
            titlePage: true,
          },
          children: coverPage,
        },
        {
          // ── Content Section (with headers/footers) ──
          properties: {
            page: {
              margin: { top: 1440, right: 1200, bottom: 1200, left: 1200 },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  spacing: { after: 80 },
                  border: {
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: C.turquoise, space: 4 },
                  },
                  children: [
                    new TextRun({
                      text: 'SISTEMA INTEGRADO DE GESTIÓN',
                      color: C.textMedium,
                      size: 16,
                      font: 'Calibri',
                      bold: true,
                    }),
                  ],
                }),
              ],
            }),
            first: new Header({
              children: [
                new Paragraph({
                  spacing: { after: 80 },
                  border: {
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: C.turquoise, space: 4 },
                  },
                  children: [
                    new TextRun({
                      text: 'SISTEMA INTEGRADO DE GESTIÓN',
                      color: C.textMedium,
                      size: 16,
                      font: 'Calibri',
                      bold: true,
                    }),
                  ],
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  border: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: C.tableBorder, space: 4 },
                  },
                  spacing: { before: 80, after: 40 },
                  children: [
                    new TextRun({
                      text: PRODUCT_DOC_BRAND,
                      color: C.textMedium,
                      size: 16,
                      font: 'Calibri',
                      bold: true,
                    }),
                    new TextRun({ text: '\t', size: 16 }),
                    new TextRun({
                      text: 'CONFIDENCIAL',
                      color: C.textMedium,
                      size: 16,
                      font: 'Calibri',
                    }),
                    new TextRun({ text: '\t', size: 16 }),
                    new TextRun({
                      text: 'Página ',
                      color: C.textMedium,
                      size: 16,
                      font: 'Calibri',
                    }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      color: C.textMedium,
                      size: 16,
                      font: 'Calibri',
                    }),
                    new TextRun({
                      text: ' de ',
                      color: C.textMedium,
                      size: 16,
                      font: 'Calibri',
                    }),
                    new TextRun({
                      children: [PageNumber.TOTAL_PAGES],
                      color: C.textMedium,
                      size: 16,
                      font: 'Calibri',
                    }),
                  ],
                }),
              ],
            }),
            first: new Footer({
              children: [
                new Paragraph({
                  border: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: C.tableBorder, space: 4 },
                  },
                  spacing: { before: 80, after: 40 },
                  children: [
                    new TextRun({
                      text: PRODUCT_DOC_BRAND,
                      color: C.textMedium,
                      size: 16,
                      font: 'Calibri',
                      bold: true,
                    }),
                    new TextRun({ text: '\t', size: 16 }),
                    new TextRun({
                      text: 'CONFIDENCIAL',
                      color: C.textMedium,
                      size: 16,
                      font: 'Calibri',
                    }),
                    new TextRun({ text: '\t', size: 16 }),
                    new TextRun({
                      text: 'Página ',
                      color: C.textMedium,
                      size: 16,
                      font: 'Calibri',
                    }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      color: C.textMedium,
                      size: 16,
                      font: 'Calibri',
                    }),
                    new TextRun({
                      text: ' de ',
                      color: C.textMedium,
                      size: 16,
                      font: 'Calibri',
                    }),
                    new TextRun({
                      children: [PageNumber.TOTAL_PAGES],
                      color: C.textMedium,
                      size: 16,
                      font: 'Calibri',
                    }),
                  ],
                }),
              ],
            }),
          },
          children: [...indexSection, ...contentSection],
        },
      ],
    });

    // ── Generate & return ────────────────────────────────────────────────────
    const buffer = new Uint8Array(await Packer.toBuffer(doc));

    const safeName = docName
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 80);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeName}_${docCode}_v${version}.docx"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('DOCX generation error:', error);
    const msg = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json(
      { success: false, error: `Error al generar DOCX: ${msg}` },
      { status: 500 }
    );
  } finally {
    resetDocColors();
  }
}
