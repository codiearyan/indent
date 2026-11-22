import { useSyncExternalStore } from 'react'
import { X } from 'lucide-react'
import type { VideoLink } from '@shared/types'
import { embedUrl } from '@shared/video'
import { IconButton } from './IconButton'
import { stopVideo } from './video'

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
 * The YouTube player, framed from its own origin. The sandbox keeps it off the app's origin, so
 * it never reaches `window.api`; its own controls and branding stay as YouTube's terms ask.
 */
export function VideoPlayer({ video }: { video: VideoLink }): React.JSX.Element | null {
  const online = useOnline()
  const src = embedUrl(video)
  if (!src) return null

  return (
    <section className="overflow-hidden rounded-lg border border-border">
      <div className="flex min-h-12 items-center gap-2 pr-2 pl-4">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{video.title}</p>
        <IconButton label="Close video" onClick={stopVideo}>
          <X />
        </IconButton>
      </div>
      {online ? (
        <iframe
          key={src}
          src={src}
          title={video.title}
          className="aspect-video w-full border-t border-rule"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <p className="border-t border-rule px-4 py-3 text-sm text-muted-foreground">
          Videos need a connection.
        </p>
      )}
    </section>
  )
}
