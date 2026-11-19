import { BookOpen, ClipboardList } from 'lucide-react'
import type { Chapter } from '@shared/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TOUR } from '@/features/tour/anchors'
import { useChapterProgress } from '@/stores/progress'
import { useSettings } from '@/stores/settings'
import { useWorkspace } from '@/stores/workspace'
import { AudioCard } from './AudioCard'
import { Markdown } from './Markdown'
import { TaskList } from './TaskList'

// Both tabs stay mounted so the audio keeps playing and scroll positions survive a tab switch.
const content = 'min-h-0 data-[state=inactive]:hidden'
// Radix wraps scroll content in a display: table div, which lets wide code blocks stretch the panel.
// Zoom sits inside the viewport so the scroll area keeps the panel's size.
const scroll = 'h-full [&_[data-slot=scroll-area-viewport]>div]:block!'

export function LeftPanel(): React.JSX.Element {
  const chapter = useWorkspace((s) => s.chapter)
  const status = useWorkspace((s) => s.status)
  const error = useWorkspace((s) => s.error)
  const leftTab = useSettings((s) => s.leftTab)
  const setLeftTab = useSettings((s) => s.setLeftTab)

  return (
    <Tabs
      value={leftTab}
      onValueChange={(tab) => setLeftTab(tab as typeof leftTab)}
      className="h-full gap-0 bg-panel"
    >
      <div className="shrink-0 p-3">
        <TabsList>
          <TabsTrigger value="insights" data-tour={TOUR.insightsTab}>
            <BookOpen />
            Chapter insights
          </TabsTrigger>
          <TabsTrigger value="tasks" data-tour={TOUR.tasksTab}>
            <ClipboardList />
            Your tasks
            {chapter && <TaskCount chapter={chapter} />}
          </TabsTrigger>
        </TabsList>
      </div>
      {status === 'error' ? (
        <p className="p-4 text-sm text-destructive">{error}</p>
      ) : status === 'loading' || !chapter ? (
        <PanelSkeleton />
      ) : (
        <>
          <TabsContent value="insights" forceMount className={content}>
            <ScrollArea className={scroll}>
              <div className="zone-lesson space-y-6 px-4 pt-1 pb-10">
                <AudioCard key={`${chapter.labId}/${chapter.id}`} lesson={chapter.lesson} />
                <Markdown>{chapter.lesson}</Markdown>
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="tasks" forceMount className={content}>
            <ScrollArea className={scroll}>
              <div className="zone-tasks">
                <TaskList chapter={chapter} />
              </div>
            </ScrollArea>
          </TabsContent>
        </>
      )}
    </Tabs>
  )
}

function TaskCount({ chapter }: { chapter: Chapter }): React.JSX.Element {
  const progress = useChapterProgress(chapter.labId, chapter.id)
  const passed = chapter.tasks.filter((t) => progress?.tasks[t.id]?.passed).length
  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {passed}/{chapter.tasks.length}
    </span>
  )
}

function PanelSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/5" />
    </div>
  )
}
