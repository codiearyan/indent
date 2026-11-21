import { mkdir, mkdtemp, symlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { byVersion, findNodeBins, nodeSource } from './nodeOptions'

describe('findNodeBins', () => {
  it('finds nvm versions and the app copy, once each, and skips shims', async () => {
    const home = await mkdtemp(join(tmpdir(), 'indent-node-'))
    const nvm = join(home, '.nvm', 'versions', 'node', 'v22.18.0', 'bin')
    const own = join(home, 'own', 'bin')
    const pathDir = join(home, 'path')
    await Promise.all([nvm, own, pathDir].map((dir) => mkdir(dir, { recursive: true })))
    await writeFile(join(nvm, 'node'), '')
    await writeFile(join(own, 'node'), '')
    await symlink(join(nvm, 'node'), join(pathDir, 'node'))
    await writeFile(join(home, 'shim'), '')
    const shimDir = join(home, 'volta-bin')
    await mkdir(shimDir)
    await symlink(join(home, 'shim'), join(shimDir, 'node'))

    const bins = findNodeBins([pathDir, shimDir].join(':'), home, own)
    expect(bins).toEqual([join(pathDir, 'node'), join(own, 'node')])
  })
})

describe('nodeSource', () => {
  it('names where a binary comes from', () => {
    expect(nodeSource('/Users/a/.nvm/versions/node/v22.18.0/bin/node', '/own')).toBe('nvm')
    expect(nodeSource('/opt/homebrew/opt/node@22/bin/node', '/own')).toBe('Homebrew')
    expect(nodeSource('/own/bin/node', '/own')).toBe("the app's copy")
    expect(nodeSource('/usr/local/bin/node', '/own')).toBe('on this computer')
  })
})

describe('byVersion', () => {
  it('puts the newest first', () => {
    expect(['v22.18.0', 'v24.1.0', 'v22.9.0'].sort(byVersion)).toEqual([
      'v24.1.0',
      'v22.18.0',
      'v22.9.0'
    ])
  })
})
