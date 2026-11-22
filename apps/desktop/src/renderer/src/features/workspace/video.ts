import { create } from 'zustand'
import type { Chapter, TaskDef, VideoLink } from '@shared/types'
import { videoSource } from '@shared/video'
import { chapterKey } from '@shared/rules'
import { useSettings } from '@/stores/settings'

interface Playing {
  /** The issue it plays for, so it stops showing when another issue opens. */
  key: string
  video: VideoLink
}

/** The video playing at the top of the Resources tab. */
export const useVideo = create<{ playing: Playing | null }>(() => ({ playing: null }))

/** Plays a video in the Resources tab, showing the tab and uncovering its list. */
export function playVideo(chapter: Chapter, video: VideoLink): void {
  const key = chapterKey(chapter.labId, chapter.id)
  const settings = useSettings.getState()
  settings.setPanel('zen', false)
  settings.setLeftTab('resources')
  settings.showResources(key)
  useVideo.setState({ playing: { key, video } })
}

export function stopVideo(): void {
  useVideo.setState({ playing: null })
}

/** A task's videos the app can play; a link the player can't open is left out. */
export const taskVideos = (task: TaskDef): VideoLink[] =>
  (task.videos ?? []).filter((video) => videoSource(video.url))
