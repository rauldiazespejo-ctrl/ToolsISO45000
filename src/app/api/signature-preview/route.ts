import { NextRequest, NextResponse } from 'next/server';
import { renderSignaturePng } from '@/lib/signature-render';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fullName = String(body.fullName || '').trim();
    const initials = String(body.initials || '').trim();
    const styleId = String(body.styleId || 'docusign-1');
    const auditSeed = body.auditSeed ? String(body.auditSeed) : undefined;

    if (!fullName) {
      return NextResponse.json(
        { success: false, error: 'Ingresa el nombre completo' },
        { status: 400 }
      );
    }

    const { dataUrl, auditId } = await renderSignaturePng({
      fullName,
      initials: initials || fullName.split(/\s+/).map((p: string) => p[0]).join('').slice(0, 2).toUpperCase(),
      styleId,
      auditSeed,
    });

    return NextResponse.json({ success: true, preview: dataUrl, auditId, styleId });
  } catch (error) {
    console.error('signature-preview error:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo generar la vista previa de firma' },
      { status: 500 }
    );
  }
}
