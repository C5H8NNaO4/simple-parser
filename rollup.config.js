import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
  input: 'example.js',
  output: {
    file: './dist/bundle.js',
    format: 'commonjs',
  },
  moduleName: 'test',
  format: 'iife',
  plugins: [
    resolve({
      jsnext: true,
      main: true,
      browser: true,
      preferBuiltins: false
    }),
    commonjs()
  ]
};