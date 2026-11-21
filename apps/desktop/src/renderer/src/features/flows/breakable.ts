/** Lets a long name wrap between its words (orderTotal, 1-october.sql) before it breaks anywhere. */
export function breakable(label: string): string {
  return label
    .replace(/([a-z0-9])([A-Z])/g, '$1\u200b$2')
    .replace(/([-_./])(?=\S)/g, '$1\u200b')
    .replace(/(\S)\(/g, '$1\u200b(')
}
