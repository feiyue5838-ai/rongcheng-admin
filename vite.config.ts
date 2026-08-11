import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath, URL } from 'node:url'
import path from 'path'
import fs from 'fs'

// SPA fallback: serve index.html for all non-file, non-API paths
function spaFallbackPlugin() {
  return {
    name: 'spa-fallback',
    configureServer(server) {
      const indexPath = path.join(import.meta.url, '..', 'index.html')
      server.middlewares.use((req: any, res: any, next: Function) => {
        const url = req.url || ''
        if (
          !url.startsWith('/api') &&
          !url.startsWith('/@') &&
          !url.startsWith('/node_modules') &&
          !url.startsWith('/uploads') &&
          !url.includes('.') &&
          fs.existsSync(indexPath)
        ) {
          res.setHeader('Content-Type', 'text/html')
          res.end(fs.readFileSync(indexPath))
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [
    spaFallbackPlugin(),
    vue(),
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      resolvers: [ElementPlusResolver({ importStyle: 'css' })],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        // 禁止手动拆 chunk：element-plus 拆出单独 chunk 会触发内部循环依赖 bug
        // 其他模块由 Rollup 自动处理
      },
    },
  },
  server: {
    port: 5185,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  preview: {
    port: 5185,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
})
