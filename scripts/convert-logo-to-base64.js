import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logoPath = path.join(__dirname, '../src/assets/rev-logo.png');
const image = fs.readFileSync(logoPath);
const base64 = image.toString('base64');
const dataUri = `data:image/png;base64,${base64}`;

console.log('Logo converted to base64. Length:', base64.length);
console.log('Data URI prefix:', dataUri.substring(0, 50) + '...');

// Save to a TypeScript file
const outputPath = path.join(__dirname, '../src/assets/rev-logo-base64.ts');
const content = `// This file is auto-generated. Do not edit manually.
export const REV_LOGO_BASE64 = '${base64}';
export const REV_LOGO_DATA_URI = '${dataUri}';
`;

fs.writeFileSync(outputPath, content);
console.log('Base64 saved to:', outputPath);

