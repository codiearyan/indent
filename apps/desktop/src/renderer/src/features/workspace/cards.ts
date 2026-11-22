/** A piece of a card: a short title, a few sentences of Markdown, and optional code. */
export interface CardPart {
  title: string
  text: string
  code?: string
  language?: string
}

export interface Choice {
  text: string
  correct: boolean
  why: string
}

/** Teaching cards the tutor writes as JSON in a fenced `card` block. */
export type Card =
  | { type: 'steps'; title: string; steps: CardPart[] }
  | { type: 'examples'; title: string; examples: CardPart[] }
  | { type: 'quiz'; question: string; code?: string; language?: string; choices: Choice[] }
  | { type: 'compare'; title: string; left: CardPart; right: CardPart }

const LIMITS = { title: 120, text: 1200, code: 2400, choice: 300 }

const isText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max

const optionalText = (value: unknown, max: number): boolean =>
  value === undefined || (typeof value === 'string' && value.length <= max)

function isPart(value: unknown): value is CardPart {
  if (typeof value !== 'object' || value === null) return false
  const part = value as Record<string, unknown>
  return (
    isText(part.title, LIMITS.title) &&
    isText(part.text, LIMITS.text) &&
    optionalText(part.code, LIMITS.code) &&
    optionalText(part.language, 20)
  )
}

const partsOf = (value: unknown, min: number, max: number): CardPart[] | null =>
  Array.isArray(value) && value.length >= min && value.length <= max && value.every(isPart)
    ? value.map(clean)
    : null

const clean = (part: CardPart): CardPart => ({
  title: part.title,
  text: part.text,
  ...(part.code ? { code: part.code, language: part.language } : {})
})

function isChoice(value: unknown): value is Choice {
  if (typeof value !== 'object' || value === null) return false
  const choice = value as Record<string, unknown>
  return (
    isText(choice.text, LIMITS.choice) &&
    typeof choice.correct === 'boolean' &&
    isText(choice.why, LIMITS.text)
  )
}

/**
 * The card a fenced `card` block describes, or null when it is not valid JSON or not one of the
 * shapes. Only known fields are kept, so a card never carries anything the app does not draw.
 */
export function parseCard(source: string): Card | null {
  let data: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(source)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    data = parsed as Record<string, unknown>
  } catch {
    return null
  }

  if (data.type === 'steps' && isText(data.title, LIMITS.title)) {
    const steps = partsOf(data.steps, 2, 8)
    return steps && { type: 'steps', title: data.title, steps }
  }
  if (data.type === 'examples' && isText(data.title, LIMITS.title)) {
    const examples = partsOf(data.examples, 1, 5)
    return examples && { type: 'examples', title: data.title, examples }
  }
  if (data.type === 'compare' && isText(data.title, LIMITS.title)) {
    if (!isPart(data.left) || !isPart(data.right)) return null
    return { type: 'compare', title: data.title, left: clean(data.left), right: clean(data.right) }
  }
  if (data.type === 'quiz' && isText(data.question, LIMITS.text)) {
    const choices = data.choices
    if (!Array.isArray(choices) || choices.length < 2 || choices.length > 5) return null
    if (!choices.every(isChoice) || !choices.some((c) => c.correct)) return null
    if (!optionalText(data.code, LIMITS.code) || !optionalText(data.language, 20)) return null
    return {
      type: 'quiz',
      question: data.question,
      choices: choices.map(({ text, correct, why }) => ({ text, correct, why })),
      ...(typeof data.code === 'string' && data.code
        ? { code: data.code, language: data.language as string | undefined }
        : {})
    }
  }
  return null
}
