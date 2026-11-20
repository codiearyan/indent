const NAMES: Record<string, string> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  sql: 'SQL',
  shell: 'Shell and git',
  html: 'HTML and CSS',
  react: 'React',
  python: 'Python',
  go: 'Go',
  rust: 'Rust',
  java: 'Java'
}

/** The name of a repo's language as people say it; the id itself when it is not known here. */
export function languageName(language: string): string {
  return NAMES[language] ?? language
}
