// The lab model's tokenizer: a token is a run of word characters or one punctuation character.
const TOKEN = /\w+|[^\w\s]/g

export function countTokens(text) {
  return text.match(TOKEN)?.length ?? 0
}

export function truncateTokens(text, limit) {
  let end = 0
  let count = 0
  for (const match of text.matchAll(TOKEN)) {
    if (count === limit) return text.slice(0, end)
    end = match.index + match[0].length
    count++
  }
  return text
}
