/**
 * Script to generate PWA icons
 * Run with: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// SVG template for the app icon
const createSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#4F46E5" rx="${size * 0.15}"/>

  <!-- Scale icon -->
  <g transform="translate(${size * 0.5}, ${size * 0.5})">
    <!-- Scale base -->
    <rect x="${-size * 0.25}" y="${size * 0.2}" width="${size * 0.5}" height="${size * 0.08}" fill="white" rx="${size * 0.02}"/>

    <!-- Scale platform -->
    <rect x="${-size * 0.3}" y="${size * 0.05}" width="${size * 0.6}" height="${size * 0.06}" fill="white" rx="${size * 0.02}"/>

    <!-- Scale needle -->
    <rect x="${-size * 0.015}" y="${-size * 0.2}" width="${size * 0.03}" height="${size * 0.25}" fill="white" rx="${size * 0.01}"/>

    <!-- Scale dial -->
    <circle cx="0" cy="${-size * 0.15}" r="${size * 0.18}" fill="none" stroke="white" stroke-width="${size * 0.02}"/>

    <!-- Weight indicator -->
    <text x="0" y="${-size * 0.1}" font-family="Arial, sans-serif" font-size="${size * 0.12}" font-weight="bold" fill="white" text-anchor="middle">
      WLPL
    </text>

    <!-- Trend arrow -->
    <path d="M ${size * 0.15} ${-size * 0.25} L ${size * 0.25} ${-size * 0.15} L ${size * 0.2} ${-size * 0.15} L ${size * 0.2} ${-size * 0.05} L ${size * 0.1} ${-size * 0.05} L ${size * 0.1} ${-size * 0.15} Z" fill="#10B981"/>
  </g>
</svg>
`;

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate SVG icons
const sizes = [192, 512];

sizes.forEach(size => {
  const svg = createSVG(size);
  const filename = path.join(publicDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(filename, svg.trim());
  console.log(`✓ Created ${filename}`);
});

// Also create a favicon.ico placeholder
const faviconSVG = createSVG(32);
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSVG.trim());
console.log(`✓ Created favicon.svg`);

console.log('\n📱 PWA icons generated successfully!');
console.log('\nNote: These are SVG icons. For production, consider:');
console.log('1. Converting to PNG using a tool like sharp or imagemagick');
console.log('2. Using a professional icon design');
console.log('3. Creating maskable versions with proper safe zones');
