import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'

// WORKAROUND: Vite 5.4.21 has a bug where renderChunk return value is ignored
// for facade modules. This plugin rebuilds the broken seals chunk in writeBundle.
function fixSealsChunkPlugin() {
  return {
    name: 'fix-seals-chunk',
    async writeBundle(options, bundle) {
      const sealsEntry = Object.entries(bundle).find(
        ([n, c]) => n.includes('seals') && n.endsWith('.js') && c.type === 'chunk'
      )
      if (!sealsEntry) return
      const [fileName, chunk] = sealsEntry

      if (chunk.code.includes('savePkg')) return // already correct

      console.log('[fix-seals-chunk] Detected broken seals chunk, rebuilding...')
      try {
        const { compileScript, compileTemplate, parse } = await import('@vue/compiler-sfc')
        const srcPath = path.resolve(__dirname, 'src/views/products/seals.vue')
        const srcCode = readFileSync(srcPath, 'utf8')
        const { descriptor } = parse(srcCode, { filename: 'seals.vue' })
        if (!descriptor.scriptSetup) return

        const scriptResult = compileScript(descriptor, {
          id: 'vite-fix-' + Date.now(),
          inlineTemplate: false,
        })
        const templateResult = compileTemplate({
          id: 'vite-fix-' + Date.now(),
          filename: 'seals.vue',
          source: descriptor.template?.content || '',
        })
        const fixedCode = [
          'import { createElementBlock as _createElementBlock, openBlock as _openBlock } from "vue"',
          scriptResult.content,
          templateResult.code,
          'export default _sfc_main'
        ].join('\n')

        const distPath = path.join(options.dir || path.resolve(__dirname, 'dist'), fileName)
        writeFileSync(distPath, fixedCode, 'utf8')
        console.log('[fix-seals-chunk] Fixed:', fixedCode.length, 'bytes')
      } catch (e) {
        console.error('[fix-seals-chunk] Error:', e.message)
      }
    }
  }
}

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
    fixSealsChunkPlugin(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
})
