import { describe, expect, it } from 'vitest'
import { summarizeComplaint } from './summarize.ts'
import { endlessComplaint, longComplaint, shortComplaint } from './complaints.ts'

describe('summarizeComplaint', () => {
  it('summarizes a short complaint', async () => {
    expect(await summarizeComplaint(shortComplaint)).toMatch(/\.$/)
  })

  it('returns a complete summary of a long complaint', async () => {
    const summary = await summarizeComplaint(longComplaint)
    expect(summary).toMatch(/^Summary: 8 points\./)
    expect(summary).toMatch(/8\) .+\.$/)
  })

  it('rejects instead of returning a summary that never fits', async () => {
    await expect(summarizeComplaint(endlessComplaint)).rejects.toThrow(/truncated/i)
  })
})
