// electron-builder beforePack hook: writes the repo library index the packaged app ships, so its
// catalog lists every repo on a first run without network. Only the starter repos are shipped.
const { execFileSync } = require('child_process')
const { join } = require('path')

exports.default = async function packIndex() {
  const root = join(__dirname, '..', '..', '..')
  execFileSync(
    process.execPath,
    [
      '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
      join(root, 'scripts', 'build-packs.mjs'),
      join(__dirname, '..', 'out', 'packs')
    ],
    { stdio: 'inherit' }
  )
}
