import VueRouter from 'vue-router/vite';
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import Vue from '@vitejs/plugin-vue'
import Fonts from 'unplugin-fonts/vite'
import { defineConfig, type Plugin } from 'vite'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

/**
 * Build-time brand de-cabling: rewrites the canonical tokens baked into the
 * static `index.html` (title / og meta) and the verbatim-copied `_headers`
 * CSP file to this deployment's domain/name. Driven by `VITE_PRIMARY_HOST`
 * (default `earnlumens.org`), so a single env var re-brands a fresh build.
 *   `earnlumens.org` -> <primary host>     (CSP api/cdn hosts)
 *   `EARNLUMENS`      -> <name, uppercase>  (document title)
 */
function brandTokens (): Plugin {
  const primaryHost = (process.env.VITE_PRIMARY_HOST || 'earnlumens.org').trim().toLowerCase()
  const platformName = (primaryHost.split('.')[0] || primaryHost).toUpperCase()
  const rewrite = (s: string): string => s
    .split('earnlumens.org').join(primaryHost)
    .split('EARNLUMENS').join(platformName)
  let outDir = 'dist'
  return {
    name: 'brand-tokens',
    apply: 'build',
    configResolved (config) {
      outDir = config.build.outDir
    },
    transformIndexHtml (html) {
      return rewrite(html)
    },
    closeBundle () {
      const headersPath = resolve(outDir, '_headers')
      if (existsSync(headersPath)) {
        writeFileSync(headersPath, rewrite(readFileSync(headersPath, 'utf8')))
      }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [VueRouter({ dts: 'src/typed-router.d.ts' }), Vue({
    template: { transformAssetUrls },
  }), // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
  Vuetify({
    autoImport: true,
  }), Fonts({
    fontsource: {
      families: [
        {
          name: 'Roboto',
          weights: [100, 300, 400, 500, 700, 900],
          styles: ['normal', 'italic'],
        },
      ],
    },
  }), brandTokens()],
  define: { 'process.env': {} },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
    extensions: [
      '.js',
      '.json',
      '.jsx',
      '.mjs',
      '.ts',
      '.tsx',
      '.vue',
    ],
  },
  server: {
    host: 'localhost.dv',
    port: 3001,
  },
})