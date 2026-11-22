import { describe, expect, it } from 'vitest'
import { clockTime, embedUrl, videoProblems, videoSource } from './video'

describe('videoSource', () => {
  it('reads videos and playlists', () => {
    expect(videoSource('https://www.youtube.com/watch?v=DHvZLI7Db8E')).toEqual({
      kind: 'video',
      id: 'DHvZLI7Db8E'
    })
    expect(videoSource('https://youtu.be/DHvZLI7Db8E')).toEqual({
      kind: 'video',
      id: 'DHvZLI7Db8E'
    })
    expect(
      videoSource('https://www.youtube.com/playlist?list=PL4cUxeGkcC9jx2TTZk3IGWKSbtugYdrlu')
    ).toEqual({ kind: 'playlist', id: 'PL4cUxeGkcC9jx2TTZk3IGWKSbtugYdrlu' })
  })

  it('refuses other links', () => {
    expect(videoSource('http://www.youtube.com/watch?v=DHvZLI7Db8E')).toBeNull()
    expect(videoSource('https://evil.com/watch?v=DHvZLI7Db8E')).toBeNull()
    expect(videoSource('https://www.youtube.com/watch?v=short')).toBeNull()
    expect(videoSource('https://www.youtube.com/channel/abc')).toBeNull()
    expect(videoSource('not a url')).toBeNull()
  })
})

describe('embedUrl', () => {
  it('plays from the nocookie origin with the given times', () => {
    expect(embedUrl({ title: 'x', url: 'https://youtu.be/DHvZLI7Db8E', start: 30, end: 90 })).toBe(
      'https://www.youtube-nocookie.com/embed/DHvZLI7Db8E?autoplay=1&rel=0&start=30&end=90'
    )
    expect(
      embedUrl({ title: 'x', url: 'https://www.youtube.com/playlist?list=PLabcdefghij' })
    ).toBe('https://www.youtube-nocookie.com/embed/videoseries?list=PLabcdefghij&autoplay=1&rel=0')
    expect(embedUrl({ title: 'x', url: 'https://example.com' })).toBeNull()
  })
})

describe('clockTime', () => {
  it('formats seconds', () => {
    expect(clockTime(5)).toBe('0:05')
    expect(clockTime(125)).toBe('2:05')
    expect(clockTime(3725)).toBe('1:02:05')
  })
})

describe('videoProblems', () => {
  const url = 'https://youtu.be/DHvZLI7Db8E'
  it('accepts good videos and no videos', () => {
    expect(videoProblems(undefined, 't')).toEqual([])
    expect(videoProblems([{ title: 'A', url, start: 10, end: 20 }], 't')).toEqual([])
  })

  it('names each problem', () => {
    expect(videoProblems('x', 't')).toEqual(['t: videos must be a list'])
    expect(
      videoProblems(
        [
          { title: '', url },
          { title: 'B', url: 'https://example.com' },
          { title: 'C', url, start: 20, end: 10 },
          { title: 'D', url, start: 1.5 },
          { title: 'E', url: 'https://www.youtube.com/playlist?list=PLabcdefghij', start: 3 }
        ],
        't'
      )
    ).toEqual([
      't: video 1 has no title',
      't: video 2 is not a YouTube video or playlist link',
      't: video 3 ends before it starts',
      't: video 4 start must be whole seconds',
      't: video 5 is a playlist, so it has no start'
    ])
  })
})
