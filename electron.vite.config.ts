import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: [] })],
    build: {
      rollupOptions: {
        external: ['better-sqlite3'],
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        }
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@main': resolve(__dirname, 'src/main'),
        '@shared': resolve(__dirname, 'shared'),
        '@product': resolve(__dirname, 'product.config.ts')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          hub: resolve(__dirname, 'src/preload/hub.ts'),
          bar: resolve(__dirname, 'src/preload/bar.ts'),
          audio: resolve(__dirname, 'src/preload/audio.ts')
        }
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@shared': resolve(__dirname, 'shared'),
        '@product': resolve(__dirname, 'product.config.ts')
      }
    }
  },
  renderer: {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          hub: resolve(__dirname, 'src/renderer/hub/index.html'),
          bar: resolve(__dirname, 'src/renderer/bar/index.html'),
          audio: resolve(__dirname, 'src/renderer/audio/index.html')
        }
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@renderer': resolve(__dirname, 'src/renderer'),
        '@shared': resolve(__dirname, 'shared'),
        '@product': resolve(__dirname, 'product.config.ts')
      }
    }
  }
});
