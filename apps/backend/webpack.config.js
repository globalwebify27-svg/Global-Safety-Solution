const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = function (options) {
  return {
    ...options,
    entry: './src/main.ts',
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'main.js',
      libraryTarget: 'commonjs2',
    },
    // Exclude ALL node_modules from the bundle.
    // They are installed by build-hostinger.js into dist/node_modules/
    // so Node.js can resolve them at runtime with correct __dirname paths.
    // This is critical for pdfkit which reads font files from its own directory.
    externals: [nodeExternals({
      // Make @prisma/client available as external too (it has its own binary)
      allowlist: [],
    })],
    resolve: {
      ...options.resolve,
    },
    target: 'node',
    // Preserve __dirname so pdfkit can find its font data files at runtime
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
