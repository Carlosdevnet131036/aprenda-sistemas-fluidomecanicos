/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Dois builds:
//  • `npm run build` (padrão): um único index.html com fontes e scripts
//    embutidos, que abre com duplo clique, sem servidor, e pode ser copiado
//    para o celular (uso offline).
//  • `npm run build:pages` (modo "pages"): arquivos separados em dist-pages/
//    para o GitHub Pages. O navegador baixa só as fontes que usa (woff2) e
//    guarda JS/CSS em cache entre as visitas.
export default defineConfig(({ mode }) => {
  const pages = mode === 'pages';
  return {
    base: './',
    plugins: [react(), ...(pages ? [] : [viteSingleFile()])],
    build: pages
      ? {
          outDir: 'dist-pages',
          rollupOptions: {
            output: {
              // bibliotecas em arquivos próprios: mudam pouco e ficam em cache
              manualChunks: { react: ['react', 'react-dom'], katex: ['katex'] },
            },
          },
        }
      : undefined,
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    },
  };
});
