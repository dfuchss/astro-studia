/**
 * Rasterize public/favicon.svg into the PNG sizes browsers still want.
 *
 *   npm run favicons
 *
 * The SVG is the source of truth; these are derived and committed so the build
 * itself needs no image processing. Run this after you edit the SVG — which
 * you will, because its colours are copies of --bg and the default accent and
 * cannot read the real tokens from public/.
 *
 * Note that an SVG comment may not contain a double hyphen: it is illegal XML,
 * and sharp refuses the file outright where a browser would quietly cope. If
 * this script reports a corrupt header, that is usually why.
 */
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC = join(process.cwd(), 'public');
const source = readFileSync(join(PUBLIC, 'favicon.svg'));

const targets = [
  [32, 'favicon-32.png'],
  [180, 'apple-touch-icon.png'],
  [512, 'icon-512.png'],
];

for (const [size, name] of targets) {
  // density is the rasterization DPI, not the output size: rendering the
  // vector large and downsampling is what keeps the 32px one from going mushy.
  await sharp(source, { density: 512 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(PUBLIC, name));
  console.log(`✓ ${name} (${size}×${size})`);
}
