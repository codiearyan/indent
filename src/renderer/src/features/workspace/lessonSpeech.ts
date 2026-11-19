/** Splits a lesson at `##` headings into plain text parts for speech; code blocks are skipped. */
export function lessonParts(markdown: string): string[] {
  return markdown
    .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '')
    .split(/^(?=##\s)/m)
    .map(toSpeech)
    .filter(Boolean)
}

function toSpeech(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+(.*)$/gm, '$1.')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*([-*+]|\d+\.)\s+/gm, '')
    .replace(/^\s*\|?[\s:|-]+\|?\s*$/gm, '')
    .replace(/^\s*([-*_]\s*){3,}$/gm, '')
    .replace(/\|/g, ', ')
    .replace(/[*~]+/g, '')
    .replace(/_+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
}
