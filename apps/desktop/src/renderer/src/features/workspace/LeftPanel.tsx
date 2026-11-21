import type { Chapter } from '@shared/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FlowFigure } from '@/features/flows/FlowPlayer'
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
// Underline tabs: the 2px ink line sits on the panel's 1px rule.
const trigger =
  'h-full flex-none rounded-none px-0 font-normal text-muted-foreground data-[state=active]:font-medium after:bottom-[-1px]!'
const scroll = 'h-full [&_[data-slot=scroll-area-viewport]>div]:block!'

export function LeftPanel(): React.JSX.Element {
  const chapter = useWorkspace((s) => s.chapter)
  const status = useWorkspace((s) => s.status)
  const leftTab = useSettings((s) => s.leftTab)
  const setLeftTab = useSettings((s) => s.setLeftTab)

  return (
    <Tabs
      id="lesson-panel"
      value={leftTab}
      onValueChange={(tab) => setLeftTab(tab as typeof leftTab)}
      className="h-full gap-0 bg-card"
    >
      <div className="h-11 shrink-0 border-b border-border px-4">
        <TabsList variant="line" className="h-full! gap-5 p-0">
          <TabsTrigger value="insights" data-tour={TOUR.insightsTab} className={trigger}>
            Lesson
          </TabsTrigger>
          <TabsTrigger value="tasks" data-tour={TOUR.tasksTab} className={trigger}>
            Tasks
            {chapter && <TaskCount chapter={chapter} />}
          </TabsTrigger>
        </TabsList>
      </div>
      {status === 'loading' || !chapter ? (
        <PanelSkeleton />
      ) : (
        <>
          <TabsContent value="insights" forceMount className={content}>
            <ScrollArea className={scroll}>
              <div className="zone-lesson space-y-6 px-6 pt-5 pb-10">
                <AudioCard
                  key={`${chapter.labId}/${chapter.id}`}
                  lesson={chapter.lesson}
                  labId={chapter.labId}
                  chapterId={chapter.id}
                />
                {chapter.flow && (
                  <div className="rounded-lg border border-border p-4">
                    <FlowFigure scene={chapter.flow.scene} />
                  </div>
                )}
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
    <span className="text-xs font-normal text-muted-foreground tabular-nums">
      {passed}/{chapter.tasks.length}
    </span>
  )
}

function PanelSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/5" />
    </div>
  )
}
