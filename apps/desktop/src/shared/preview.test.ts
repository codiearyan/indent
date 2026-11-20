import { describe, expect, it } from 'vitest'
import { previewTarget, previewUrl } from './preview'

describe('preview urls', () => {
  it('round-trips a workspace page', () => {
    const url = previewUrl('web-pages', 'opening-hours', 'index.html')
    expect(previewTarget(url)).toEqual({
      labId: 'web-pages',
      chapterId: 'opening-hours',
      path: 'index.html'
    })
  })

  it('serves index.html for the root and keeps nested paths', () => {
    expect(previewTarget('indent-preview://a.b/').path).toBe('index.html')
    expect(previewTarget('indent-preview://a.b/src/main.jsx?x=1').path).toBe('src/main.jsx')
  })

  it('leaves escapes in the path for the workspace check to refuse', () => {
    expect(previewTarget('indent-preview://a.b/..%2f..%2fsecret').path).toBe('../../secret')
  })

  it('refuses hosts that are not chapter.lab', () => {
    expect(() => previewTarget('indent-preview://only/')).toThrow()
    expect(() => previewTarget('indent-preview://a.b.c/')).toThrow()
  })
})
