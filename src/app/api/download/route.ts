import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const projectDir = process.cwd();
    const zipPath = path.join(projectDir, 'pulso-ai-project.zip');

    if (!fs.existsSync(zipPath)) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(zipPath);
    const stats = fs.statSync(zipPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="pulso-ai-project.zip"',
        'Content-Length': stats.size.toString(),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error al generar descarga' }, { status: 500 });
  }
}
