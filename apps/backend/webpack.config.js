const path = require('path');

module.exports = function (options) {
  return {
    ...options,
    entry: './src/main.ts',
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'main.js',
      libraryTarget: 'commonjs2',
    },
    // In this npm-workspace monorepo, most packages are hoisted to the root
    // node_modules, so webpack-node-externals with default settings doesn't
    // see them and bundles everything into main.js. This is INTENTIONAL —
    // it means dist/ is self-contained and only needs native/binary deps
    // installed via npm install.
    //
    // EXCEPTION: pdfkit must be external because its source code uses
    // __dirname + readFileSync() to load .afm font files at runtime.
    // When bundled, __dirname becomes dist/ instead of pdfkit's own
    // package dir, causing ENOENT errors on Hostinger.
    externals: [
      function({ request }, callback) {
        if (/^pdfkit(\/.*)?$/.test(request)) {
          return callback(null, 'commonjs ' + request);
        }
        callback();
      },
    ],
    resolve: {
      ...options.resolve,
    },
    target: 'node',
    // Preserve __dirname so pdfkit (loaded from node_modules at runtime)
    // can find its font data files relative to its own package directory
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
