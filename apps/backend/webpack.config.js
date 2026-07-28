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
    // Bundle ALL dependencies into main.js — no node_modules needed at runtime.
    externals: [],
    // Merge our alias into NestJS's existing resolve config (which handles .ts extensions).
    // We alias pdfkit to its standalone build which embeds ALL font AFM data inline,
    // bypassing the fs.readFileSync(__dirname + '/data/...') calls that break when
    // webpack rewrites __dirname on Hostinger.
    resolve: {
      ...options.resolve,
      alias: {
        ...(options.resolve && options.resolve.alias ? options.resolve.alias : {}),
        'pdfkit': path.resolve(__dirname, '../../node_modules/pdfkit/js/pdfkit.standalone.js'),
      },
    },
    target: 'node',
    devtool: false,
    performance: false,
    optimization: {
      minimize: false,
    },
  };
};
