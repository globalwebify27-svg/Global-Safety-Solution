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
    // Bundle ALL dependencies into main.js — no node_modules needed at runtime
    externals: [],
    target: 'node',
    devtool: false,
    performance: false,
    optimization: {
      minimize: false,
    },
  };
};
