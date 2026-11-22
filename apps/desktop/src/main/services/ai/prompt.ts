import type {
  AiAttachment,
  AiCompletionTask,
  AiMessage,
  ChapterDef,
  ChapterProgress,
  CheckResult,
  TaskDef,
  TaskProgress,
  WorkspaceFile
} from '@shared/types'
import type { LearnerContext } from './learner'

const MAX_FILE_CHARS = 20_000
const MAX_OUTPUT_CHARS = 1_500
const MAX_HISTORY = 20
const MAX_ATTACHMENT_CHARS = 6_000

const TUTOR_RULES = `You are the tutor inside Indent, a desktop app where a learner works through one issue of a hands-on coding repo: a short lesson, a few tasks, an editor and a terminal. Pressing Check runs hidden tests on their code. When their code calls an AI model, it talks to the local model, an offline stand-in that runs on this computer. Say repo, issue and local model when you talk about these.

How you help:
- Be patient and encouraging. The learner is here to learn by doing.
- When a check failed, explain in plain words why, using the check message and output below.
- When asked what a line or piece of code does, explain it.
- A learner message can start with something they attached: their own code, a check result or a hint. Attached code is the learner's own: explain what it does and point at the line or idea to look at, without rewriting it into the answer.
- When a hint is attached, explain the idea behind it in other words and how it relates to their code. Do not turn the hint into the task's code.
- Point to the part of the lesson that covers the idea, by its heading.
- When a check failed, name the one link from that task's docs that covers the problem and say what to read it for. Use only the links listed with the task; never make one up.
- When a short video would help more than reading, or the learner asks for one, link one of that task's videos with its exact title and link from the list. It opens in the Resources tab beside the task. Use only the videos listed with the task; never make one up.
- Use how the earlier checks went: a check that keeps failing means the learner is stuck on that idea, so go back to it from another side.
- The learner section says who you are talking to. Pitch every answer to it: for someone new to coding, use plain words, explain a term the first time it comes up and take small steps; for an experienced developer, be brief and skip the basics. When they prefer videos and a task lists one, point to it before a doc.
- You may mention their progress in one short sentence when it helps them keep going: the last task of this issue, the day's goal one task away, a streak worth keeping. At most once in a conversation, never as pressure and never instead of help. Use only the numbers given; never make one up.
- Ask one guiding question when it helps the learner find the next step themselves.
- Small examples are welcome, but they must show the idea on different names and data, never the task's own answer.
- When how pieces connect or the order things happen is the point, draw a small diagram in a \`\`\`mermaid block: a top-down flowchart (\`flowchart TD\`, since the tutor panel is narrow) or a \`sequenceDiagram\`, at most eight nodes, short labels in plain words, no styles, links or click handlers. Use one only when it says more than a sentence would, and never draw the task's solution.
- A teaching card can show an idea better than paragraphs. Write one as a fenced block tagged \`card\` that holds a single JSON object and nothing else, with one sentence before it, and at most one card per reply:
  - Steps, for a process or what code does line by line: \`{"type":"steps","title":"...","steps":[{"title":"...","text":"...","code":"...","language":"ts"}]}\`, two to six steps.
  - Examples, for worked examples the learner opens one at a time: \`{"type":"examples","title":"...","examples":[{"title":"...","text":"...","code":"...","language":"ts"}]}\`, one to four.
  - Check yourself, after you explained an idea, so the learner can test it: \`{"type":"quiz","question":"...","code":"...","language":"ts","choices":[{"text":"...","correct":true,"why":"..."}]}\`, two to four choices, at least one correct, each with why.
  - Compare, for two ways side by side (mutating and copying, slow and fast): \`{"type":"compare","title":"...","left":{"title":"...","text":"..."},"right":{"title":"...","text":"..."}}\`.
  \`text\` and \`why\` are short Markdown; \`code\` and \`language\` are optional. A card follows every rule here: other names and data than the task, never the task's answer or a drop-in fix.

What you never do:
- Never write the finished answer to a task, the full file, or a drop-in fix for their code. If asked, explain the idea and give the next small step instead.
- Never guess at or describe the hidden tests beyond what the check messages already say.

Answer in short markdown: a few sentences or a short list, code in fenced blocks tagged with their language (\`\`\`ts, \`\`\`sql, \`\`\`html). Keep follow-up replies in the same conversation shorter still, two or three sentences, unless the learner asks for more. Stay on this issue; for unrelated questions, say briefly that you can help with this issue.`

export interface TutorContext {
  chapter: ChapterDef
  lesson: string
  activeFile?: WorkspaceFile
  lastCheck?: CheckResult[]
  progress?: ChapterProgress
  learner?: LearnerContext
}

const EXPERIENCE_WORDS: Record<NonNullable<LearnerContext['experience']>, string> = {
  new: 'new to coding',
  some: 'has written some code before',
  experienced: 'an experienced developer'
}

const count = (n: number, word: string): string => `${n} ${n === 1 ? word : `${word}s`}`

export function describeLearner(l: LearnerContext): string {
  const today =
    l.today.tasksPassed >= l.today.goal
      ? `today's goal of ${count(l.today.goal, 'task')} is met (${l.today.tasksPassed} passed today)`
      : `${l.today.tasksPassed} of ${count(l.today.goal, 'task')} passed today toward the daily goal`
  return [
    `- Experience: ${l.experience ? EXPERIENCE_WORDS[l.experience] : 'not given'}`,
    l.learnFirst ? `- Prefers ${l.learnFirst} first when they want to learn more` : '',
    `- Level ${l.level}, ${l.pointsToNextLevel} points to level ${l.level + 1} (${l.totalPoints} points in all)`,
    `- Streak: ${count(l.streak, 'day')} (longest ${l.longestStreak}), ${count(l.freezes, 'freeze')} held; ${today}`,
    `- In the repo "${l.repo.title}": issue ${l.repo.issueNumber} of ${l.repo.issueCount}, ${count(l.repo.issuesFinished, 'issue')} finished`,
    `- This issue: ${l.issue.tasksPassed} of ${count(l.issue.taskCount, 'task')} passed, ${count(l.issue.hintsOpened, 'hint')} opened`,
    `- Issues finished in the app: ${l.issuesFinished}`
  ]
    .filter(Boolean)
    .join('\n')
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
          : '',
        describeDocs(task),
        describeVideos(task)
      ]
        .filter(Boolean)
        .join('\n\n')
    )
    .join('\n\n')
}

function describeDocs(task: TaskDef): string {
  return task.docs?.length
    ? `Docs:\n${task.docs.map((d) => `- [${d.title}](${d.url})`).join('\n')}`
    : ''
}

function describeVideos(task: TaskDef): string {
  return task.videos?.length
    ? `Videos:\n${task.videos.map((v) => `- [${v.title}](${v.url})`).join('\n')}`
    : ''
}

function describeTaskHistory(task: TaskDef, progress: TaskProgress | undefined): string {
  if (progress?.passed) return `- ${task.id}: passed`
  const fails = progress?.failedChecks ?? 0
  if (!fails) return `- ${task.id}: no failed checks yet`
  const names = Object.entries(progress?.failedNames ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name} (${count})`)
  return `- ${task.id}: failed ${fails} ${fails === 1 ? 'check' : 'checks'}${names.length ? `; failing most: ${names.join(', ')}` : ''}`
}

function describeHistory(chapter: ChapterDef, progress: ChapterProgress | undefined): string {
  return chapter.tasks.map((task) => describeTaskHistory(task, progress?.tasks[task.id])).join('\n')
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
  lastCheck,
  progress,
  learner
}: TutorContext): string {
  const parts = [
    TUTOR_RULES,
    ...(learner ? [`# The learner\n\n${describeLearner(learner)}`] : []),
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
  if (progress)
    parts.push(`## How the checks have gone so far\n\n${describeHistory(chapter, progress)}`)
  return parts.join('\n\n')
}

export const TIP_RULES = `You write one short tip for a learner in Indent, a desktop app with hands-on coding issues. The learner has failed the checks of one task several times. In two or three plain sentences, say which idea they seem stuck on, judging by the checks that keep failing, and what to look at next. If one of the task's docs covers it, name it by its title. Never write the answer, code that solves the task, or a fix for their code. No greeting, no markdown headings.`

/** Everything the tip needs: the task, its docs, how its checks went and the learner's file. */
export function tipPrompt(
  task: TaskDef,
  progress: TaskProgress | undefined,
  file: WorkspaceFile | undefined
): string {
  const parts = [
    `## Task: ${task.title}\n\n${task.description}`,
    describeDocs(task),
    `## Checks so far\n\n${describeTaskHistory(task, progress)}`,
    progress?.lastResult ? `## Latest result\n\n${describeChecks([progress.lastResult])}` : '',
    file ? `## ${file.path}\n\n\`\`\`\n${clip(file.content, MAX_FILE_CHARS)}\n\`\`\`` : ''
  ]
  return parts.filter(Boolean).join('\n\n')
}

const MAX_TIP_CHARS = 600

export function cleanTip(raw: string): string {
  const text = raw.trim().replace(/\n{3,}/g, '\n\n')
  return text.length > MAX_TIP_CHARS ? `${text.slice(0, MAX_TIP_CHARS).trimEnd()}...` : text
}

const ATTACHMENT_KINDS: AiAttachment['kind'][] = ['code', 'check', 'hint']

/** The attachment written out above the question, the way the model reads it. */
export function withAttachment(content: string, attachment: AiAttachment | undefined): string {
  if (
    !attachment ||
    !ATTACHMENT_KINDS.includes(attachment.kind) ||
    typeof attachment.text !== 'string' ||
    !attachment.text.trim()
  ) {
    return content
  }
  const language =
    attachment.kind === 'code' && /^[\w+-]{1,20}$/.test(attachment.language ?? '')
      ? attachment.language
      : ''
  const label = String(attachment.label ?? attachment.kind).slice(0, 200)
  const text = clip(attachment.text, MAX_ATTACHMENT_CHARS)
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length))
  const fence = '`'.repeat(Math.max(3, longest + 1))
  return `Attached ${attachment.kind} (${label}):\n\n${fence}${language}\n${text}\n${fence}\n\n${content}`
}

/**
 * Keeps the latest turns, starting with a learner message, with only valid roles, and folds any
 * attachment into the message text so providers get plain `{ role, content }` turns.
 */
export function trimHistory(messages: AiMessage[]): AiMessage[] {
  const valid = messages.filter(
    (m) =>
      (m.role === 'user' || m.role === 'assistant') &&
      typeof m.content === 'string' &&
      m.content.trim()
  )
  const recent = valid.slice(-MAX_HISTORY)
  const start = recent.findIndex((m) => m.role === 'user')
  if (start === -1) return []
  return recent.slice(start).map((m) => ({
    role: m.role,
    content: m.role === 'user' ? withAttachment(m.content, m.attachment) : m.content
  }))
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

export const COMPLETION_RULES = `You are an inline code completion engine in a learning app. Reply with only the code to insert at <cursor/>: no explanation, no markdown fences, no text that repeats what is already before or after the cursor. Insert at most a few lines, usually finishing the current line or statement. Never write a whole function body or a whole task answer in one go; the learner is practicing. If nothing useful fits, reply with nothing.

When a task is given, it is the one the learner is working on. Suggest only the next small step toward it from where the cursor is, one or two lines, and leave the rest to the learner. Never write code that would make the task pass on its own: no whole function body, no complete loop or calculation the task asks for. If checks are failing, a step may move toward what they name, but never fix all of it at once.`

const MAX_TASK_TITLE_CHARS = 200
const MAX_TASK_CHARS = 3_000
const MAX_FAILING = 10
const MAX_CHECK_NAME_CHARS = 200

/** The task from the renderer, checked and cut to size; anything malformed is left out. */
export function completionTask(task: unknown): AiCompletionTask | undefined {
  if (!task || typeof task !== 'object') return undefined
  const { title, description, failing } = task as Partial<AiCompletionTask>
  if (typeof title !== 'string' || !title.trim() || typeof description !== 'string') {
    return undefined
  }
  return {
    title: title.slice(0, MAX_TASK_TITLE_CHARS),
    description: clip(description, MAX_TASK_CHARS),
    failing: Array.isArray(failing)
      ? failing
          .filter((name): name is string => typeof name === 'string' && !!name.trim())
          .slice(0, MAX_FAILING)
          .map((name) => name.slice(0, MAX_CHECK_NAME_CHARS))
      : []
  }
}

export function completionPrompt(
  path: string,
  prefix: string,
  suffix: string,
  task?: AiCompletionTask
): string {
  const file = `File: ${path}\n\n${prefix}<cursor/>${suffix}`
  if (!task) return file
  const failing = task.failing.length
    ? `\n\nFailing checks:\n${task.failing.map((name) => `- ${name}`).join('\n')}`
    : ''
  return `Task: ${task.title}\n\n${task.description.trim()}${failing}\n\n${file}`
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
