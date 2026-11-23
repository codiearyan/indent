import { create } from 'zustand'
import type { Chapter, TaskDef, VideoLink } from '@shared/types'
import { videoSource } from '@shared/video'
import { chapterKey } from '@shared/rules'
import { useSettings } from '@/stores/settings'
import { useWorkspace } from '@/stores/workspace'

interface Playing {
  /** The issue it plays for, so it stops showing when another issue opens. */
  key: string
  video: VideoLink
}

/** The video asked to play in the Resources tab, from a task or a tutor reply. */
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

/** A task's videos the app can play; a link the player can't open is left out. */
export const taskVideos = (task: TaskDef): VideoLink[] =>
  (task.videos ?? []).filter((video) => videoSource(video.url))

/** Plays a link from a tutor reply in Resources when it is one of this issue's videos. */
export function playLinkedVideo(href: string): boolean {
  const chapter = useWorkspace.getState().chapter
  const source = videoSource(href)
  if (!chapter || !source) return false
  for (const task of chapter.tasks) {
    const video = taskVideos(task).find((v) => {
      const other = videoSource(v.url)
      return other?.kind === source.kind && other.id === source.id
    })
    if (video) {
      playVideo(chapter, video)
      return true
    }
  }
  return false
}
