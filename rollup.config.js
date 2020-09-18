import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default [
  {
  input: 'index.js',
  output: [
    {
      file: 'dist/cjs/index.js',
      format: 'cjs'
    },
    {
      file: 'dist/es/index.js',
      format: 'es'
    }
  ],
  // external: ['@abandonware/noble'],
  plugins: [
    resolve({
      exclude: './node_modules',
      extensions: '.js'}),
    json(),
    commonjs({exclude: "node_modules"}),
  ]
}
];
