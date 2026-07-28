/**
 * Custom webpack loader that inlines pdfkit's font data (.afm) and ICC profile
 * directly into the source code at BUILD TIME.
 *
 * WHY: pdfkit uses fs.readFileSync(__dirname + '/data/Helvetica.afm', 'utf8')
 * to load font metrics. When webpack bundles pdfkit, __dirname becomes the
 * output directory (dist/), but the .afm files aren't there on Hostinger.
 * This loader replaces those readFileSync calls with the actual file contents
 * as inline string/Buffer literals, eliminating ALL filesystem dependencies
 * for fonts and ICC profiles.
 */
const fs = require('fs');
const path = require('path');

module.exports = function (source) {
  console.log('[pdfkit-font-inline-loader] Processing:', this.resourcePath);
  const dataDir = path.join(path.dirname(this.resourcePath), 'data');

  if (!fs.existsSync(dataDir)) {
    console.warn('[pdfkit-font-inline-loader] Data directory not found:', dataDir);
    return source;
  }

  let replacements = 0;

  // 1. Inline all .afm font files (read as utf8 text)
  const afmFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.afm'));
  for (const file of afmFiles) {
    const filePath = path.join(dataDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    this.addDependency(filePath);

    const searchStr = `fs.readFileSync(__dirname + '/data/${file}', 'utf8')`;
    if (source.includes(searchStr)) {
      source = source.split(searchStr).join(JSON.stringify(content));
      replacements++;
      console.log(`[pdfkit-font-inline-loader] Inlined: ${file}`);
    }
  }

  // 2. Inline the ICC color profile (read as binary → Buffer)
  const iccFile = 'sRGB_IEC61966_2_1.icc';
  const iccPath = path.join(dataDir, iccFile);
  if (fs.existsSync(iccPath)) {
    const iccContent = fs.readFileSync(iccPath);
    this.addDependency(iccPath);

    const iccSearchStr = 'fs.readFileSync(`${__dirname}/data/sRGB_IEC61966_2_1.icc`)';
    if (source.includes(iccSearchStr)) {
      const iccReplacement = `Buffer.from("${iccContent.toString('base64')}", "base64")`;
      source = source.split(iccSearchStr).join(iccReplacement);
      replacements++;
      console.log(`[pdfkit-font-inline-loader] Inlined: ${iccFile}`);
    }
  }

  console.log(`[pdfkit-font-inline-loader] Total replacements: ${replacements}`);
  return source;
};
