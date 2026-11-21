import { describe, expect, it } from 'vitest'
import { repoStars } from './rules'

describe('repoStars', () => {
  it('gives three stars when most tasks pass first time without hints', () => {
    expect(repoStars({ tasks: 10, firstTry: 8, failedChecks: 3, hints: 1 })).toBe(3)
  })

  it('gives two stars for a steady run with some retries and hints', () => {
    expect(repoStars({ tasks: 10, firstTry: 4, failedChecks: 12, hints: 6 })).toBe(2)
  })

  it('gives one star, never fewer, to a repo that took many tries', () => {
    expect(repoStars({ tasks: 10, firstTry: 0, failedChecks: 60, hints: 30 })).toBe(1)
  })

  it('needs every part of a star, not just one', () => {
    expect(repoStars({ tasks: 10, firstTry: 10, failedChecks: 0, hints: 10 })).toBe(2)
    expect(repoStars({ tasks: 10, firstTry: 10, failedChecks: 0, hints: 20 })).toBe(1)
  })

  it('counts the limits as reached at the threshold itself', () => {
    expect(repoStars({ tasks: 5, firstTry: 3, failedChecks: 5, hints: 1 })).toBe(3)
  })

  it('gives one star to a repo with no tasks', () => {
    expect(repoStars({ tasks: 0, firstTry: 0, failedChecks: 0, hints: 0 })).toBe(1)
  })
})
