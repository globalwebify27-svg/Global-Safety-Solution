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
    // No externals — everything is bundled into main.js.
    // This makes dist/ fully self-contained (just main.js + native deps).
    // This is required because npm workspaces hoists packages to the root
    // node_modules, and Hostinger's dist/node_modules/ doesn't have them.
    externals: [],
    resolve: {
      ...options.resolve,
      alias: {
        ...((options.resolve && options.resolve.alias) || {}),
        // CRITICAL FIX: Redirect pdfkit to its standalone build.
        // The normal pdfkit.js uses fs.readFileSync(__dirname + '/data/Helvetica.afm')
        // to load font metrics at runtime. When webpack bundles it, __dirname
        // becomes the dist/ directory, and the .afm files don't exist there
        // on Hostinger. The standalone build has ALL font data embedded inline
        // as strings — zero filesystem reads, works everywhere.
        'pdfkit': path.resolve(__dirname, '..', '..', 'node_modules', 'pdfkit', 'js', 'pdfkit.standalone.js'),
      },
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
