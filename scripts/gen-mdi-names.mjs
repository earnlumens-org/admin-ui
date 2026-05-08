#!/usr/bin/env node
/**
 * Generates `src/assets/mdi-names.json` from `@mdi/svg/meta.json` so the
 * Spaces icon picker can fuzzy-search the full MDI catalogue without
 * shipping ~40 MB of SVGs.
 *
 * Output shape: `string[]` of plain icon names (no `mdi-` prefix), e.g.
 * `["account", "account-alert", "account-arrow-down", ...]`.
 *
 * We intentionally drop aliases / tags / codepoints to keep the bundle
 * tiny (~80 KB gzipped). The picker prefixes "mdi-" at render time.
 *
 * Run automatically via the `prebuild` npm script.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(__dirname, '../node_modules/@mdi/svg/meta.json')
const OUT = resolve(__dirname, '../src/assets/mdi-names.json')

const meta = JSON.parse(readFileSync(SRC, 'utf8'))
const names = [...new Set(meta.map(m => m.name))].sort()

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(names))
console.log(`mdi-names: wrote ${names.length} icons to ${OUT}`)
