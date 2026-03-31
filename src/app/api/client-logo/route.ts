import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { CLIENT_LOGO_BASENAME, getUploadsDir } from '@/lib/upload-paths';

export async function GET() {
  const primary = path.join(getUploadsDir(), CLIENT_LOGO_BASENAME);
  const legacy = path.join(process.cwd(), 'public', CLIENT_LOGO_BASENAME);

  let filePath: string | null = null;
  if (existsSync(primary)) filePath = primary;
  else if (existsSync(legacy)) filePath = legacy;

  if (!filePath) {
    return new NextResponse(null, { status: 404 });
  }

  const buf = await readFile(filePath);
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
    },
  });
}
