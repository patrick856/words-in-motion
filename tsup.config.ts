import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'intro/index': 'src/intro/index.ts',
    'loop/index': 'src/loop/index.ts',
    'outro/index': 'src/outro/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: false,
  clean: true,
  sourcemap: true,
  target: 'es2022',
  splitting: false,
});
