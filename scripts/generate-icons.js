/**
 * Script to generate PWA icons from favicon.svg
 * Run with: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '..', 'public', 'favicon.svg');
const publicPath = path.join(__dirname, '..', 'public');

const sizes = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-72x72.png', size: 72 },
  { name: 'icon-96x96.png', size: 96 },
  { name: 'icon-128x128.png', size: 128 },
  { name: 'icon-144x144.png', size: 144 },
  { name: 'icon-152x152.png', size: 152 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-384x384.png', size: 384 },
  { name: 'icon-512x512.png', size: 512 }
];

async function generateIcons() {
  console.log('📱 Generating PWA icons from favicon.svg...\n');

  const svgBuffer = fs.readFileSync(svgPath);

  for (const { name, size } of sizes) {
    const outputPath = path.join(publicPath, name);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`✓ Generated ${name} (${size}x${size})`);
  }

  console.log('\n✓ All PWA icons generated successfully!');
}

generateIcons().catch(error => {
  console.error('❌ Error generating icons:', error);
  process.exit(1);
});
