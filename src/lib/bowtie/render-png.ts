import sharp from 'sharp';
import { renderBowtieSvg } from '@/lib/bowtie/render-svg';
import type { BowtieModel } from '@/lib/bowtie/types';

export async function renderBowtiePng(model: BowtieModel): Promise<Buffer> {
  const svg = renderBowtieSvg(model);
  return sharp(Buffer.from(svg)).png({ quality: 90 }).toBuffer();
}
