/**
 * The release notes as plain text with `* ` bullets. The updater hands them over as the release's
 * HTML, or as a list of notes per version.
 */
export function releaseNoteText(
  notes: string | { note: string | null }[] | null | undefined
): string {
  const text = typeof notes === 'string' ? notes : (notes ?? []).map((n) => n.note ?? '').join('\n')
  return text
    .replace(/<li[^>]*>/gi, '\n* ')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

/** A few plain lines from a generated release body: its bullets, without authors and links. */
export function shortNotes(body: string, max = 5): string[] {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[*-] /.test(line))
    .map((line) =>
      line
        .replace(/^[*-] /, '')
        .replace(/ by @\S+ in \S+$/, '')
        .replace(/^\w+(\([^)]*\))?!?: /, '')
    )
    .map((line) => line.charAt(0).toUpperCase() + line.slice(1))
    .slice(0, max)
}
