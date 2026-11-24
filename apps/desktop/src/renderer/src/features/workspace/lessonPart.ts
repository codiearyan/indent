/** The part being read: the last heading at or above the top of the lesson, or none above the first. */
export function currentPart(
  headings: { text: string; top: number }[],
  viewTop: number
): string | null {
  let part: string | null = null
  for (const heading of headings) {
    if (heading.top > viewTop + 8) break
    part = heading.text
  }
  return part
}
