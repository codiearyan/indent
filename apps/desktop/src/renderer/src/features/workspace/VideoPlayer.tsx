import { useEffect, useRef, useSyncExternalStore } from 'react'
import { Check } from 'lucide-react'
import type { VideoLink } from '@shared/types'
import { clockTime, embedUrl, videoSource } from '@shared/video'
import { useSettings } from '@/stores/settings'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

const useOnline = (): boolean => useSyncExternalStore(subscribe, () => navigator.onLine)

/**
 * A video's embedded player, framed from its own origin. The sandbox keeps it off the app's
 * origin, so it never reaches `window.api`; its own controls and branding stay, as its terms ask.
 * `load` is false while Resources is covered, so nothing is fetched before the learner asks.
 */
export function VideoPlayer({
  video,
  load,
  autoplay
}: {
  video: VideoLink
  load: boolean
  autoplay: boolean
}): React.JSX.Element | null {
  const online = useOnline()
  const watched = useSettings((s) => s.videosWatched.includes(video.url))
  const markVideoWatched = useSettings((s) => s.markVideoWatched)
  const frame = useRef<HTMLIFrameElement>(null)
  const src = embedUrl(video, autoplay)
  const playlist = videoSource(video.url)?.kind === 'playlist'
  const meta = playlist ? 'Playlist' : video.start ? `From ${clockTime(video.start)}` : null

  useEffect(() => {
    if (autoplay) frame.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [autoplay, src])

  // The player is cross-origin, so a click into it shows only as the window losing focus to it.
  useEffect(() => {
    const onBlur = (): void => {
      if (document.activeElement === frame.current) markVideoWatched(video.url)
    }
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [markVideoWatched, video.url])

  if (!src) return null

  return (
    <div>
      <div className="flex min-h-12 items-center gap-3 px-4 text-sm">
        <span className="min-w-0 flex-1">{video.title}</span>
        {meta && <span className="text-[13px] text-muted-foreground tabular-nums">{meta}</span>}
        {watched && (
          <Check className="size-4 shrink-0 text-success" strokeWidth={1.5} aria-label="Watched" />
        )}
      </div>
      {online || !load ? (
        <iframe
          ref={frame}
          key={src}
          src={load ? src : undefined}
          title={video.title}
          loading="lazy"
          className="block aspect-video w-full border-t border-rule bg-muted"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          onLoad={() => autoplay && load && markVideoWatched(video.url)}
        />
      ) : (
        <p className="border-t border-rule px-4 py-3 text-sm text-muted-foreground">
          Videos need a connection.
        </p>
      )}
    </div>
  )
}
