import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { CLIENT_LOGO_BASENAME, ensureUploadsDir, getUploadsDir } from '@/lib/upload-paths';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('logo') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de archivo no soportado. Usa PNG, JPG, SVG o WebP.' },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'El archivo es demasiado grande. Máximo 5MB.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    ensureUploadsDir();
    const pngBuffer = await sharp(buffer)
      .resize(800, 400, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();

    const base64 = pngBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    return NextResponse.json({
      success: true,
      path: dataUrl,
      filename: 'logo.png',
    });
  } catch (error) {
    console.error('Logo upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al subir el logo' },
      { status: 500 }
    );
  }
}
