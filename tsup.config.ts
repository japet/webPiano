import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/web-piano.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['lit'],
});
