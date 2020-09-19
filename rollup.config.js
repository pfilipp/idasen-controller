import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import peerDeps from 'rollup-plugin-peer-deps-external'

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
    external: ['@abandonware/noble'],
    plugins: [
      peerDeps(),
      resolve({
        exclude: 'node_modules',
        extensions: '.js'
      }),
      json(),
      commonjs({ exclude: 'node_modules' })
    ]
  }
]
