import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  // Bundle the workspace-only `@spacy/shared` into the SDK output so
  // consumers do not need to reach for a private package.
  noExternal: ['@spacy/shared'],
  // viem and react come from the consumer; declared as peerDependencies.
  external: ['react', 'react-dom', 'viem', 'viem/chains', 'viem/accounts'],
  target: 'es2022',
})
