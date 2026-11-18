import { spawnSync } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const outputDir = fileURLToPath(new URL('../dist/', import.meta.url))
const rspackCli = fileURLToPath(new URL('../node_modules/@rspack/cli/bin/rspack.js', import.meta.url))

await rm(outputDir, { recursive: true, force: true })

const result = spawnSync(process.execPath, [rspackCli, 'build', '-c', 'rspack.config.ts'], {
  cwd: projectRoot,
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: 'inherit',
})

if (result.error) throw result.error
process.exitCode = result.status ?? 1
