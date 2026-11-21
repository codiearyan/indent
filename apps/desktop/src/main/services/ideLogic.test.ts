import { describe, expect, it } from 'vitest'
import { IDES, launch, launchCandidates } from './ideLogic'

const zed = IDES.find((ide) => ide.id === 'zed')!
const webstorm = IDES.find((ide) => ide.id === 'webstorm')!
const places = {
  home: '/home/me',
  localAppData: 'C:/Users/me/AppData/Local',
  programFiles: 'C:/PF'
}

describe('launchCandidates', () => {
  it('looks in both Applications folders on macOS, then on the PATH', () => {
    expect(launchCandidates(zed, 'darwin', places)).toEqual([
      {
        file: '/Applications/Zed.app',
        command: '/usr/bin/open',
        args: ['-a', '/Applications/Zed.app']
      },
      {
        file: '/home/me/Applications/Zed.app',
        command: '/usr/bin/open',
        args: ['-a', '/home/me/Applications/Zed.app']
      },
      { bin: 'zed', args: [] }
    ])
  })

  it('looks in the usual program folders on Windows', () => {
    expect(launchCandidates(zed, 'win32', places)).toEqual([
      { file: 'C:/Users/me/AppData/Local/Programs/Zed/Zed.exe', args: [] },
      { file: 'C:/PF/Zed/Zed.exe', args: [] }
    ])
  })

  it('has nothing to look for on Windows without a known program', () => {
    expect(launchCandidates(webstorm, 'win32', places)).toEqual([])
  })

  it('looks on the PATH on Linux', () => {
    expect(launchCandidates(zed, 'linux', places)).toEqual([{ bin: 'zed', args: [] }])
  })
})

describe('launch', () => {
  it('is done when the program ends without an error', async () => {
    await expect(launch(process.execPath, ['-e', ''], 'Zed')).resolves.toBeUndefined()
  })

  it('is done when the program keeps running, as an IDE does', async () => {
    await expect(
      launch(process.execPath, ['-e', 'setTimeout(() => {}, 4000)'], 'Zed', 200)
    ).resolves.toBeUndefined()
  })

  it('says the IDE did not open when the program fails', async () => {
    await expect(launch(process.execPath, ['-e', 'process.exit(3)'], 'Zed')).rejects.toThrow(
      'Zed did not open.'
    )
  })

  it('says the IDE did not open when the program is not there', async () => {
    await expect(launch('/no/such/program', [], 'Zed')).rejects.toThrow('Zed did not open.')
  })
})
