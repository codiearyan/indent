import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, CircleHelp, MessageCircle } from 'lucide-react'
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

const crumb = 'shrink-0 text-muted-foreground transition-colors hover:text-foreground'

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
      className="app-drag flex h-12 shrink-0 items-center gap-1 bg-background pr-2"
      style={{ paddingLeft: 'calc(var(--titlebar-inset) + 8px)' }}
    >
      <IconButton label="Back to the lab" onClick={() => navigate(`/labs/${labId}`)}>
        <ArrowLeft />
      </IconButton>
      <nav
        aria-label="Breadcrumb"
        className="ml-1 flex min-w-0 flex-1 items-center gap-1.5 text-[13px]"
      >
        <Link to="/labs" className={crumb}>
          Labs
        </Link>
        <span className="text-muted-foreground/60">/</span>
        <Link to={`/labs/${labId}`} className={`${crumb} min-w-0 shrink truncate`}>
          {chapter?.labTitle}
        </Link>
        {chapter && (
          <>
            <span className="text-muted-foreground/60">/</span>
            <span className="min-w-0 shrink-[0.5] truncate font-medium" aria-current="page">
              Chapter {chapter.number}: {chapter.title}
            </span>
            <span className="ml-1 flex shrink-0 items-center">
              <IconButton
                label="Previous chapter"
                disabled={!chapter.prevChapterId}
                onClick={() => goToChapter(chapter.prevChapterId)}
              >
                <ChevronLeft />
              </IconButton>
              <IconButton
                label="Next chapter"
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
