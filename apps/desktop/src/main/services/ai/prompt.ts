import type { AiMessage, ChapterDef, CheckResult, WorkspaceFile } from '@shared/types'

const MAX_FILE_CHARS = 20_000
const MAX_OUTPUT_CHARS = 1_500
const MAX_HISTORY = 20

const TUTOR_RULES = `You are the tutor inside Indent, a desktop app where a learner works through one issue of a hands-on coding repo: a short lesson, a few tasks, an editor and a terminal. Pressing Check runs hidden tests on their code. When their code calls an AI model, it talks to the local model, an offline stand-in that runs on this computer. Say repo, issue and local model when you talk about these.

How you help:
- Be patient and encouraging. The learner is here to learn by doing.
- When a check failed, explain in plain words why, using the check message and output below.
- When asked what a line or piece of code does, explain it.
- Point to the part of the lesson that covers the idea, by its heading.
- Ask one guiding question when it helps the learner find the next step themselves.
- Small examples are welcome, but they must show the idea on different names and data, never the task's own answer.

What you never do:
- Never write the finished answer to a task, the full file, or a drop-in fix for their code. If asked, explain the idea and give the next small step instead.
- Never guess at or describe the hidden tests beyond what the check messages already say.

Answer in short markdown: a few sentences or a short list, code in fenced blocks. Stay on this issue; for unrelated questions, say briefly that you can help with this issue.`

export interface TutorContext {
  chapter: ChapterDef
  lesson: string
  activeFile?: WorkspaceFile
  lastCheck?: CheckResult[]
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}\n[... cut ...]` : text
}

function describeTasks(chapter: ChapterDef): string {
  return chapter.tasks
    .map((task, i) =>
      [
        `### Task ${i + 1}: ${task.title} (id ${task.id}, file ${task.file})`,
        task.description,
        task.nextSteps.length
          ? `Suggested steps:\n${task.nextSteps.map((s) => `- ${s}`).join('\n')}`
          : ''
      ]
        .filter(Boolean)
        .join('\n\n')
    )
    .join('\n\n')
}

function describeChecks(results: CheckResult[]): string {
  return results
    .map((result) => {
      if (result.error) return `- ${result.taskId}: the check could not run (${result.error})`
      const details = result.details.map((d) =>
        [
          `  - ${d.passed ? 'passed' : 'failed'}: ${d.name}`,
          d.message ? `    message: ${d.message}` : '',
          d.output ? `    output:\n${clip(d.output, MAX_OUTPUT_CHARS)}` : ''
        ]
          .filter(Boolean)
          .join('\n')
      )
      return [
        `- ${result.taskId}: ${result.passed ? 'passed' : 'not passed yet'}`,
        ...details
      ].join('\n')
    })
    .join('\n')
}

/** The system prompt: rules first, then everything the tutor can see. */
export function tutorSystemPrompt({
  chapter,
  lesson,
  activeFile,
  lastCheck
}: TutorContext): string {
  const parts = [
    TUTOR_RULES,
    `# Issue: ${chapter.title}\n\n## Lesson\n\n${lesson.trim()}`,
    `## Tasks\n\n${describeTasks(chapter)}`
  ]
  if (activeFile) {
    parts.push(
      `## The file open in the editor: ${activeFile.path}\n\n\`\`\`\n${clip(activeFile.content, MAX_FILE_CHARS)}\n\`\`\``
    )
  }
  parts.push(
    lastCheck?.length
      ? `## Latest check results\n\n${describeChecks(lastCheck)}`
      : '## Latest check results\n\nThe learner has not run a check yet.'
  )
  return parts.join('\n\n')
}

/** Keeps the latest turns, starting with a learner message, with only valid roles. */
export function trimHistory(messages: AiMessage[]): AiMessage[] {
  const valid = messages.filter(
    (m) =>
      (m.role === 'user' || m.role === 'assistant') &&
      typeof m.content === 'string' &&
      m.content.trim()
  )
  const recent = valid.slice(-MAX_HISTORY)
  const start = recent.findIndex((m) => m.role === 'user')
  return start === -1 ? [] : recent.slice(start)
}

/** CLIs take a single prompt, so the conversation is written out as a transcript. */
export function transcript(messages: AiMessage[]): string {
  const earlier = messages.slice(0, -1)
  const last = messages[messages.length - 1]
  const history = earlier
    .map((m) => `${m.role === 'user' ? 'Learner' : 'Tutor'}: ${m.content}`)
    .join('\n\n')
  return history
    ? `Conversation so far:\n\n${history}\n\nThe learner now asks:\n\n${last.content}`
    : last.content
}

/** For CLIs without a system prompt flag. */
export function withInstructions(system: string, prompt: string): string {
  return `<instructions>\n${system}\n</instructions>\n\n${prompt}`
}

export const COMPLETION_RULES = `You are an inline code completion engine in a learning app. Reply with only the code to insert at <cursor/>: no explanation, no markdown fences, no text that repeats what is already before or after the cursor. Insert at most a few lines, usually finishing the current line or statement. Never write a whole function body or a whole task answer in one go; the learner is practicing. If nothing useful fits, reply with nothing.`

export function completionPrompt(path: string, prefix: string, suffix: string): string {
  return `File: ${path}\n\n${prefix}<cursor/>${suffix}`
}

const MAX_COMPLETION_LINES = 6

/** Strips fences and chatter models add anyway, and keeps the suggestion short. */
export function cleanCompletion(raw: string): string {
  let text = raw.replace(/^\s*```[\w-]*\n?/, '').replace(/\n?```\s*$/, '')
  if (!text.trim()) return ''
  text = text.split('\n').slice(0, MAX_COMPLETION_LINES).join('\n')
  return text.replace(/\s+$/, '')
}

export function maskKey(key: string): string {
  const trimmed = key.trim()
  return trimmed.length <= 8 ? '••••' : `${trimmed.slice(0, 3)}••••${trimmed.slice(-4)}`
}
