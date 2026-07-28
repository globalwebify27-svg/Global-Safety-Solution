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
    // Keep pdfkit, fontkit, and qrcode as externals — they use
    // fs.readFileSync(__dirname + '/data/...') at runtime to load font/AFM
    // files. Webpack rewrites __dirname, breaking those file lookups and
    // causing 500/503 crashes on Hostinger. Loading them from node_modules
    // at runtime preserves the correct __dirname paths.
    externals: [
      function({ request }, callback) {
        if (/^(pdfkit|fontkit|qrcode|png-js|linebreak)$/.test(request)) {
          return callback(null, 'commonjs ' + request);
        }
        callback();
      },
    ],
    target: 'node',
    devtool: false,
    performance: false,
    optimization: {
      minimize: false,
    },
  };
};
