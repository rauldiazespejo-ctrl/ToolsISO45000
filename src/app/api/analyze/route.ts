import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import ZAI from 'z-ai-web-dev-sdk';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const docName = formData.get('docName') as string;
    const docDescription = formData.get('docDescription') as string;
    const normRef = formData.get('normRef') as string;
    const companyName = formData.get('companyName') as string;
    const existingContent = formData.get('existingContent') as string | null;

    if (!file && !existingContent) {
      return NextResponse.json({ success: false, error: 'Debes subir un archivo o pegar contenido' });
    }

    let fileText = existingContent || '';

    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ success: false, error: 'Archivo demasiado grande (máximo 10MB)' });
      }

      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['docx', 'pdf', 'odt', 'txt', 'md'].includes(ext || '')) {
        return NextResponse.json({ success: false, error: 'Formato no soportado. Usa .docx, .pdf, .odt, .txt' });
      }

      if (ext === 'txt' || ext === 'md') {
        fileText = await file.text();
      } else {
        try {
          const tmpDir = os.tmpdir();
          const tmpFile = path.join(tmpDir, `upload_${Date.now()}.${ext}`);
          const mdFile = path.join(tmpDir, `upload_${Date.now()}.md`);
          const bytes = Buffer.from(await file.arrayBuffer());
          fs.writeFileSync(tmpFile, bytes);

          try {
            if (ext === 'docx') {
              execSync(`pandoc "${tmpFile}" -t markdown -o "${mdFile}"`, { timeout: 15000 });
              fileText = fs.readFileSync(mdFile, 'utf-8');
              try { fs.unlinkSync(mdFile); } catch { /* ignore */ }
            } else if (ext === 'pdf') {
              const txt = execSync(`pdftotext "${tmpFile}" -`, { timeout: 15000, maxBuffer: 1024 * 1024 });
              fileText = txt.toString('utf-8');
            } else {
              fileText = bytes.toString('utf-8');
            }
          } catch {
            fileText = `[No se pudo extraer el texto del archivo .${ext}. Intente con un archivo .docx, .txt o pegue el contenido directamente.]`;
          }
          try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
        } catch {
          fileText = existingContent || '[No se pudo procesar el archivo]';
        }
      }
    }

    if (!fileText || fileText.length < 50) {
      return NextResponse.json({ success: false, error: 'El contenido extraído es muy corto para analizar' });
    }

    const zai = await ZAI.create();

    const analysisPrompt = `Eres un auditor experto en Seguridad y Salud en el Trabajo (SST) en Chile, 
especializado en ISO 45001:2018, Decreto Supremo N° 44/2024 y Ley 16.744.

DOCUMENTO EXISTENTE A ANALIZAR:
---
${fileText.slice(0, 8000)}
---

REQUISITO NORMATIVO DEL DOCUMENTO:
- Nombre: ${docName}
- Referencia Normativa: ${normRef}
- Empresa: ${companyName}

INSTRUCCIONES:
Analiza el documento existente vs el requisito normativo y genera un informe estructurado con:

## 1. EVALUACIÓN GENERAL
- Nivel de cumplimiento estimado (%)
- Estado del documento (Actualizado / Parcialmente actualizado / Desactualizado / No aplica)

## 2. CONTENIDO CUMPLE - MANTENER
Lista de secciones/elementos que están correctos y deben mantenerse

## 3. CONTENIDO FALTANTE - AGREGAR
Lista detallada de contenido que falta según el requisito normativo

## 4. CONTENIDO OBSOLETO - MODIFICAR
Lista de contenido desactualizado que necesita actualizarse

## 5. REFERENCIAS NORMATIVAS FALTANTES
Referencias a DS 44, ISO 45001, Ley 16.744 u otras normas que faltan

## 6. CAMBIOS PROPUESTOS (JSON)
Genera un array JSON con los cambios específicos. Formato EXACTO (sin texto adicional antes ni después del JSON):
\`\`\`json
[
  {"section": "Nombre de sección", "original": "texto original", "proposed": "texto propuesto"},
  ...
]
\`\`\`

## 7. PROPUESTA DE DOCUMENTO ACTUALIZADO
Genera el contenido completo del documento actualizado integrando todo lo anterior.

Responde en español, con formato markdown estructurado.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Eres un auditor experto en SST chileno. Responde siempre en español con formato markdown.' },
        { role: 'user', content: analysisPrompt },
      ],
    });

    const analysis = completion.choices[0]?.message?.content || 'No se pudo generar el análisis';

    // Extract updated document (section 7)
    let updatedContent = '';
    const section7Match = analysis.match(/## 7\.\s*PROPUESTA[\s\S]*$/i);
    if (section7Match) {
      updatedContent = section7Match[0].replace(/^## 7\.\s*PROPUESTA[^\n]*\n?/i, '').trim();
    }

    // Extract gap report (sections 1-5)
    const gapReport = analysis.replace(/## 6\.[\s\S]*$/i, '').trim();

    // Extract changes JSON from section 6
    const changes: { id: number; section: string; original: string; proposed: string; accepted: boolean }[] = [];
    const jsonMatch = analysis.match(/```json\s*([\s\S]*?)```/i);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        if (Array.isArray(parsed)) {
          parsed.forEach((item: { section: string; original: string; proposed: string }, idx: number) => {
            changes.push({
              id: idx + 1,
              section: item.section || `Cambio ${idx + 1}`,
              original: item.original || '',
              proposed: item.proposed || '',
              accepted: true,
            });
          });
        }
      } catch {
        // If JSON parse fails, create a single generic change entry
        changes.push({
          id: 1,
          section: 'Actualización general',
          original: 'Contenido original del documento',
          proposed: 'Contenido actualizado según normativa vigente',
          accepted: true,
        });
      }
    }

    return NextResponse.json({
      success: true,
      result: {
        gapReport,
        originalContent: fileText,
        updatedContent,
        changes,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al analizar el documento';
    return NextResponse.json({ success: false, error: msg });
  }
}
