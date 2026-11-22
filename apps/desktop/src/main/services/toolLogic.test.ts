import { describe, expect, it } from 'vitest'
import {
  cppVersion,
  installerFor,
  javacVersion,
  javaSupported,
  javaVersion,
  pythonSupported,
  pythonVersion,
  wantsPython3Shim
} from './toolLogic'

describe('tool versions', () => {
  it('reads Python 3 and refuses Python 2', () => {
    expect(pythonVersion('Python 3.12.1\n')).toBe('3.12.1')
    expect(pythonVersion('\nPython 3.13.0rc1')).toBe('3.13.0rc1')
    expect(pythonVersion('\nPython 2.7.18\n')).toBeNull()
    expect(pythonVersion('Python was not found; run without arguments to install')).toBeNull()
  })

  it('reads javac and java', () => {
    expect(javacVersion('javac 21.0.2\n')).toBe('21.0.2')
    expect(javacVersion('\nPicked up JAVA_TOOL_OPTIONS: -Xmx1g\njavac 1.8.0_392')).toBe('1.8.0_392')
    expect(javaVersion('\nopenjdk version "21.0.2" 2024-01-16\nOpenJDK Runtime')).toBe('21.0.2')
    expect(javaVersion('\njava version "1.8.0_392"')).toBe('1.8.0_392')
  })

  it('names the C++ compiler from its first line', () => {
    expect(cppVersion('Apple clang version 21.0.0 (clang-2100.4.1.1)\nTarget: arm64')).toBe(
      'Apple clang 21.0.0'
    )
    expect(cppVersion('Ubuntu clang version 18.1.3 (1ubuntu1)\n')).toBe('Ubuntu clang 18.1.3')
    expect(cppVersion('g++ (Ubuntu 13.2.0-23ubuntu4) 13.2.0\nCopyright (C) 2023')).toBe(
      'g++ 13.2.0'
    )
    expect(cppVersion('g++ (GCC) 14.2.1 20240910\n')).toBe('g++ 14.2.1')
    expect(cppVersion('g++.exe (Rev2, Built by MSYS2 project) 14.2.0\n')).toBe('g++ 14.2.0')
  })

  it('wants Python 3.9 and Java 17 or newer', () => {
    expect(pythonSupported('3.9.6')).toBe(true)
    expect(pythonSupported('3.12.1')).toBe(true)
    expect(pythonSupported('3.8.10')).toBe(false)
    expect(javaSupported('17.0.10')).toBe(true)
    expect(javaSupported('21.0.2')).toBe(true)
    expect(javaSupported('11.0.22')).toBe(false)
    expect(javaSupported('1.8.0_392')).toBe(false)
  })
})

describe('the python3 of the app', () => {
  it('is wanted on Windows only when Python 3 has no python3', () => {
    expect(wantsPython3Shim('win32', null, '3.14.10')).toBe(true)
    expect(wantsPython3Shim('win32', '3.14.10', null)).toBe(false)
    expect(wantsPython3Shim('win32', null, null)).toBe(false)
    expect(wantsPython3Shim('darwin', null, '3.12.1')).toBe(false)
    expect(wantsPython3Shim('linux', null, '3.12.1')).toBe(false)
  })
})

describe('installerFor', () => {
  const winget = (id: string): string[] => [
    ...['install', '--id', id, '-e', '--source', 'winget'],
    ...['--accept-package-agreements', '--accept-source-agreements']
  ]

  it("uses Apple's developer tools for Git, Python and C++, not Java", () => {
    const xcode = { cmd: 'xcode-select', args: ['--install'] }
    expect(installerFor('git', 'darwin', new Set())).toEqual(xcode)
    expect(installerFor('cpp', 'darwin', new Set())).toEqual(xcode)
    expect(installerFor('python', 'darwin', new Set())).toEqual(xcode)
    expect(installerFor('java', 'darwin', new Set())).toBeNull()
  })

  it('uses winget on Windows when it is there', () => {
    const found = new Set(['winget'])
    expect(installerFor('git', 'win32', found)).toEqual({ cmd: 'winget', args: winget('Git.Git') })
    expect(installerFor('python', 'win32', found)?.args).toEqual(winget('Python.Python.3.14'))
    expect(installerFor('java', 'win32', found)?.args).toEqual(
      winget('EclipseAdoptium.Temurin.25.JDK')
    )
    expect(installerFor('cpp', 'win32', found)).toBeNull()
    expect(installerFor('python', 'win32', new Set())).toBeNull()
  })

  it('uses the first package manager on Linux through pkexec', () => {
    const on = (...bins: string[]): Set<string> => new Set(['pkexec', ...bins])
    expect(installerFor('java', 'linux', on('apt-get', 'dnf'))).toEqual({
      cmd: 'pkexec',
      args: ['apt-get', 'install', '-y', 'openjdk-17-jdk']
    })
    expect(installerFor('cpp', 'linux', on('apt-get'))?.args.at(-1)).toBe('g++')
    expect(installerFor('cpp', 'linux', on('dnf'))?.args).toEqual([
      'dnf',
      'install',
      '-y',
      'gcc-c++'
    ])
    expect(installerFor('java', 'linux', on('dnf'))?.args.at(-1)).toBe('java-21-openjdk-devel')
    expect(installerFor('python', 'linux', on('pacman'))?.args).toEqual([
      'pacman',
      '-S',
      '--noconfirm',
      'python'
    ])
    expect(installerFor('java', 'linux', on('pacman'))?.args.at(-1)).toBe('jdk21-openjdk')
    expect(installerFor('cpp', 'linux', on('zypper'))?.args).toEqual([
      'zypper',
      '--non-interactive',
      'install',
      'gcc-c++'
    ])
    expect(installerFor('git', 'linux', on('zypper'))?.args.at(-1)).toBe('git')
    expect(installerFor('git', 'linux', new Set(['apt-get']))).toBeNull()
    expect(installerFor('git', 'linux', on())).toBeNull()
  })
})
