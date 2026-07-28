const path = require('path');
const fs = require('fs');

module.exports = function (options) {
  // Build the pdfkit font data replacements map at config time
  const pdfkitDataDir = path.resolve(__dirname, '..', '..', 'node_modules', 'pdfkit', 'js', 'data');
  const fontReplacements = {};
  if (fs.existsSync(pdfkitDataDir)) {
    const afmFiles = fs.readdirSync(pdfkitDataDir).filter(f => f.endsWith('.afm'));
    for (const file of afmFiles) {
      const content = fs.readFileSync(path.join(pdfkitDataDir, file), 'utf8');
      fontReplacements[`fs.readFileSync(__dirname + '/data/${file}', 'utf8')`] = JSON.stringify(content);
    }
    // ICC color profile (binary file)
    const iccFile = 'sRGB_IEC61966_2_1.icc';
    const iccPath = path.join(pdfkitDataDir, iccFile);
    if (fs.existsSync(iccPath)) {
      const iccContent = fs.readFileSync(iccPath);
      fontReplacements['fs.readFileSync(`${__dirname}/data/sRGB_IEC61966_2_1.icc`)'] =
        `Buffer.from("${iccContent.toString('base64')}", "base64")`;
    }
  }

  return {
    ...options,
    entry: './src/main.ts',
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'main.js',
      libraryTarget: 'commonjs2',
    },
    // No externals — everything is bundled into main.js.
    // This makes dist/ fully self-contained for Hostinger deployment.
    externals: [],
    module: {
      ...options.module,
      rules: [
        ...(options.module?.rules || []),
        // Inline pdfkit font data: replaces fs.readFileSync calls for .afm
        // files with the actual file contents as string literals. This runs
        // as a pre-loader (before ts-loader) on pdfkit's source file.
        {
          test: /pdfkit/,
          include: path.resolve(__dirname, '..', '..', 'node_modules', 'pdfkit', 'js'),
          enforce: 'pre',
          use: [
            {
              loader: path.resolve(__dirname, 'pdfkit-font-inline-loader.js'),
            },
          ],
        },
      ],
    },
    resolve: {
      ...options.resolve,
    },
    target: 'node',
    node: {
      __dirname: false,
      __filename: false,
    },
    devtool: false,
    performance: false,
    optimization: {
      minimize: false,
    },
  };
};
