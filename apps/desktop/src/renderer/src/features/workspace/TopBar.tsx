import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, CircleHelp, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AiMenu } from '@/features/ai/AiMenu'
import { useAiEnabled } from '@/features/ai/aiStore'
import { cn } from '@/lib/utils'
import { TOUR } from '@/features/tour/anchors'
import { useSettings } from '@/stores/settings'
import { useWorkspace } from '@/stores/workspace'
import { IconButton } from './IconButton'
import { ViewPopover } from './ViewPopover'

const crumb = 'shrink-0 text-muted-foreground transition-colors hover:text-foreground'

export function TopBar(): React.JSX.Element {
  const { labId = '' } = useParams()
  const navigate = useNavigate()
  const chapter = useWorkspace((s) => s.chapter)
  const chatOpen = useSettings((s) => s.panels.chat)
  const togglePanel = useSettings((s) => s.togglePanel)
  const aiOn = useAiEnabled()
  const ready = useWorkspace((s) => s.status === 'ready')
  const setTourOpen = useWorkspace((s) => s.setTourOpen)

  const goToChapter = (id?: string): void => {
    if (id) navigate(`/learn/${labId}/${id}`)
  }

  return (
    <header
      className="app-drag flex h-12 shrink-0 items-center gap-1 bg-background pr-2"
      style={{ paddingLeft: 'calc(var(--titlebar-inset) + 8px)' }}
    >
      <IconButton label="Back to the repo" onClick={() => navigate(`/labs/${labId}`)}>
        <ArrowLeft />
      </IconButton>
      <nav
        aria-label="Breadcrumb"
        className="ml-1 flex min-w-0 flex-1 items-center gap-1.5 text-[13px]"
      >
        <Link to="/labs" className={crumb}>
          Repos
        </Link>
        <span className="text-muted-foreground/60">/</span>
        <Link to={`/labs/${labId}`} className={`${crumb} min-w-0 shrink truncate`}>
          {chapter?.labTitle}
        </Link>
        {chapter && (
          <>
            <span className="text-muted-foreground/60">/</span>
            <span className="min-w-0 shrink-[0.5] truncate font-medium" aria-current="page">
              Issue {chapter.number}: {chapter.title}
            </span>
            <span className="ml-1 flex shrink-0 items-center">
              <IconButton
                label="Previous issue"
                shortcut="previousIssue"
                disabled={!chapter.prevChapterId}
                onClick={() => goToChapter(chapter.prevChapterId)}
              >
                <ChevronLeft />
              </IconButton>
              <IconButton
                label="Next issue"
                shortcut="nextIssue"
                disabled={!chapter.nextChapterId}
                onClick={() => goToChapter(chapter.nextChapterId)}
              >
                <ChevronRight />
              </IconButton>
            </span>
          </>
        )}
      </nav>
      <div className="flex shrink-0 items-center gap-0.5">
        {aiOn && (
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={chatOpen}
            onClick={() => togglePanel('chat')}
            data-tour={TOUR.chat}
            className={cn(
              'font-normal text-muted-foreground hover:text-foreground [&_svg]:stroke-[1.5]',
              chatOpen && 'bg-accent text-foreground'
            )}
          >
            <MessageCircle />
            Tutor
          </Button>
        )}
        <AiMenu />
        <ViewPopover />
        <IconButton
          label="Take the tour"
          disabled={!ready}
          onClick={() => setTourOpen(true)}
          data-tour={TOUR.help}
        >
          <CircleHelp />
        </IconButton>
      </div>
    </header>
  )
}
