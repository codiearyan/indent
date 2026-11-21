// electron-builder beforePack hook (electron-builder.yml): writes the repo library
// index the packaged app ships, so its catalog lists every repo on a first run without network.
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export default async function packIndex() {
  execFileSync(
    process.execPath,
    [
      '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
      fileURLToPath(new URL('../../../scripts/build-packs.mjs', import.meta.url)),
      fileURLToPath(new URL('../out/packs', import.meta.url))
    ],
    { stdio: 'inherit' }
  )
}
