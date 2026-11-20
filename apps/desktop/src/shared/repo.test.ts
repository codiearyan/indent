import { describe, expect, it } from 'vitest'
import { REPO_URL, repoRequestUrl } from './repo'

describe('repoRequestUrl', () => {
  it('opens a new issue titled with what was searched for', () => {
    const url = new URL(repoRequestUrl('  Rust & WebAssembly '))
    expect(url.origin + url.pathname).toBe(`${REPO_URL}/issues/new`)
    expect(url.searchParams.get('title')).toBe('Repo request: Rust & WebAssembly')
    expect(url.searchParams.get('body')).toContain('What should this repo teach?')
  })

  it('still has a title when nothing was searched for', () => {
    expect(new URL(repoRequestUrl('')).searchParams.get('title')).toBe('Repo request')
  })
})
