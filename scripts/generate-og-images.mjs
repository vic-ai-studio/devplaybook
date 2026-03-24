/**
 * Generate PNG fallbacks for OG images (social media unfurling requires PNG/JPG)
 * Usage: node scripts/generate-og-images.mjs
 */
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../public');

const svgFiles = ['og-default.svg', 'og-tools.svg', 'og-blog.svg'];

for (const file of svgFiles) {
  const svgPath = join(publicDir, file);
  const pngPath = join(publicDir, file.replace('.svg', '.png'));
  const svg = readFileSync(svgPath, 'utf-8');

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  writeFileSync(pngPath, pngBuffer);
  console.log(`✅ Generated ${file.replace('.svg', '.png')} (${(pngBuffer.length / 1024).toFixed(0)} KB)`);
}
