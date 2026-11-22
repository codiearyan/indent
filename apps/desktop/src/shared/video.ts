import type { VideoLink } from './types'

/** The only origin the renderer may frame for videos (CSP `frame-src`). */
export const VIDEO_ORIGIN = 'https://www.youtube-nocookie.com'

export type VideoSource = { kind: 'video' | 'playlist'; id: string }

const HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com']
const VIDEO_ID = /^[\w-]{11}$/
const LIST_ID = /^[\w-]{10,64}$/

/** The YouTube video or playlist a link points at, or null when it is neither. */
export function videoSource(url: string): VideoSource | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:') return null
  const video = (id: string | null): VideoSource | null =>
    id && VIDEO_ID.test(id) ? { kind: 'video', id } : null

  if (parsed.hostname === 'youtu.be') return video(parsed.pathname.slice(1))
  if (!HOSTS.includes(parsed.hostname)) return null
  if (parsed.pathname === '/watch') return video(parsed.searchParams.get('v'))
  if (parsed.pathname === '/playlist') {
    const list = parsed.searchParams.get('list')
    return list && LIST_ID.test(list) ? { kind: 'playlist', id: list } : null
  }
  return null
}

/** The player address for a video link, or null when the link is not a YouTube one. */
export function embedUrl(video: VideoLink): string | null {
  const source = videoSource(video.url)
  if (!source) return null
  if (source.kind === 'playlist') {
    return `${VIDEO_ORIGIN}/embed/videoseries?list=${source.id}&autoplay=1&rel=0`
  }
  const params = new URLSearchParams({ autoplay: '1', rel: '0' })
  if (video.start) params.set('start', String(video.start))
  if (video.end) params.set('end', String(video.end))
  return `${VIDEO_ORIGIN}/embed/${source.id}?${params}`
}

/** "2:05" or "1:02:05". */
export function clockTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = String(seconds % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

const isSeconds = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0

/** What is wrong with a task's `videos`, in words for the pack check; empty when it is fine. */
export function videoProblems(videos: unknown, where: string): string[] {
  if (videos === undefined) return []
  if (!Array.isArray(videos)) return [`${where}: videos must be a list`]
  const problems: string[] = []
  videos.forEach((video: Partial<VideoLink>, i) => {
    const at = `${where}: video ${i + 1}`
    if (typeof video?.title !== 'string' || !video.title.trim()) problems.push(`${at} has no title`)
    const source = typeof video?.url === 'string' ? videoSource(video.url) : null
    if (!source) {
      problems.push(`${at} is not a YouTube video or playlist link`)
      return
    }
    for (const key of ['start', 'end'] as const) {
      if (video[key] === undefined) continue
      if (source.kind === 'playlist') problems.push(`${at} is a playlist, so it has no ${key}`)
      else if (!isSeconds(video[key])) problems.push(`${at} ${key} must be whole seconds`)
    }
    if (isSeconds(video.start) && isSeconds(video.end) && video.end <= video.start) {
      problems.push(`${at} ends before it starts`)
    }
  })
  return problems
}
