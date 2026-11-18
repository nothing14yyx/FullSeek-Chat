import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tools = path.join(root, '.tools')
const javaHome = path.join(tools, 'jdk21')
const androidHome = path.join(tools, 'android-sdk')
const env = { ...process.env }

if (!env.JAVA_HOME && existsSync(path.join(javaHome, 'bin', 'java'))) {
  env.JAVA_HOME = javaHome
}
if (!env.ANDROID_HOME && existsSync(path.join(androidHome, 'cmdline-tools', 'latest'))) {
  env.ANDROID_HOME = androidHome
}
if (!env.ANDROID_SDK_ROOT && env.ANDROID_HOME) {
  env.ANDROID_SDK_ROOT = env.ANDROID_HOME
}
if (env.JAVA_HOME) {
  env.PATH = `${path.join(env.JAVA_HOME, 'bin')}${path.delimiter}${env.PATH ?? ''}`
}
env.GRADLE_USER_HOME ??= path.join(tools, 'gradle')

const run = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

const cap = path.join(
  root,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'cap.cmd' : 'cap'
)
run(cap, ['sync', 'android'], root)
run(
  process.platform === 'win32' ? 'gradlew.bat' : './gradlew',
  ['assembleDebug'],
  path.join(root, 'android')
)
