import { describe, expect, it } from 'vitest'
import { freshWindowsPath, regPath } from './windowsPath'

describe('Windows PATH from the registry', () => {
  it('reads the Path value and expands variables', () => {
    const out = `
HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment
    Path    REG_EXPAND_SZ    %SystemRoot%\\system32;C:\\Program Files\\Git\\cmd
`
    const system = regPath(out)
    expect(system).toBe('%SystemRoot%\\system32;C:\\Program Files\\Git\\cmd')
    expect(freshWindowsPath(system, 'C:\\Users\\a\\bin', { SystemRoot: 'C:\\Windows' })).toBe(
      'C:\\Windows\\system32;C:\\Program Files\\Git\\cmd;C:\\Users\\a\\bin'
    )
    expect(regPath('ERROR: The system was unable to find the specified registry key')).toBe('')
  })
})
