import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, CircleHelp, MessageCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { LevelBadge } from '@/components/app/LevelBadge'
import { ThemeToggle } from '@/components/app/ThemeToggle'
import { AiMenu } from '@/features/ai/AiMenu'
import { TOUR } from '@/features/tour/anchors'
import { useSettings } from '@/stores/settings'
import { useWorkspace } from '@/stores/workspace'
import { IconButton } from './IconButton'
import { LayoutPopover } from './LayoutPopover'
import { ModeMenu } from './ModeMenu'
import { ResetButton } from './ResetButton'
import { TextSizePopover } from './TextSizePopover'

export function TopBar(): React.JSX.Element {
  const { labId = '', chapterId = '' } = useParams()
  const navigate = useNavigate()
  const chapter = useWorkspace((s) => s.chapter)
  const setTourOpen = useWorkspace((s) => s.setTourOpen)
  const chatOpen = useSettings((s) => s.panels.chat)
  const togglePanel = useSettings((s) => s.togglePanel)

  const goToChapter = (id?: string): void => {
    if (id) navigate(`/learn/${labId}/${id}`)
  }

  return (
    <header
      className="app-drag flex h-14 shrink-0 items-center gap-2 pr-3"
      style={{ paddingLeft: 'calc(var(--titlebar-inset) + 12px)' }}
    >
      <IconButton label="Back to the lab" onClick={() => navigate(`/labs/${labId}`)}>
        <ArrowLeft />
      </IconButton>
      <Badge variant="outline" className="font-normal text-muted-foreground">
        Self-paced
      </Badge>
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
        <Link to="/labs" className="shrink-0 text-muted-foreground hover:text-foreground">
          My labs
        </Link>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        <Link
          to={`/labs/${labId}`}
          className="min-w-0 truncate text-muted-foreground hover:text-foreground"
        >
          {chapter?.labTitle}
        </Link>
        {chapter && (
          <>
            <IconButton
              label="Previous chapter"
              disabled={!chapter.prevChapterId}
              onClick={() => goToChapter(chapter.prevChapterId)}
            >
              <ChevronLeft />
            </IconButton>
            <span className="flex min-w-0 shrink-[0.5] items-center gap-1.5">
              <span className="shrink-0 text-muted-foreground">Chapter {chapter.number}</span>
              <span className="text-muted-foreground">·</span>
              <span className="truncate font-medium" aria-current="page">
                {chapter.title}
              </span>
            </span>
            <IconButton
              label="Next chapter"
              disabled={!chapter.nextChapterId}
              onClick={() => goToChapter(chapter.nextChapterId)}
            >
              <ChevronRight />
            </IconButton>
          </>
        )}
      </nav>
      <div className="flex shrink-0 items-center gap-1">
        <ModeMenu labId={labId} chapterId={chapterId} />
        <LevelBadge data-tour={TOUR.level} />
        <IconButton label="Take the tour" onClick={() => setTourOpen(true)}>
          <CircleHelp />
        </IconButton>
        <AiMenu />
        <ResetButton />
        <IconButton
          label={chatOpen ? 'Close chat' : 'Open chat'}
          pressed={chatOpen}
          onClick={() => togglePanel('chat')}
          data-tour={TOUR.chat}
        >
          <MessageCircle />
        </IconButton>
        <TextSizePopover />
        <LayoutPopover />
        <ThemeToggle />
      </div>
    </header>
  )
}
