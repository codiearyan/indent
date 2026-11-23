import { addGrams, tinTitle } from '../src/lists.ts'

// @ts-expect-error: addGrams has no type parameter, so a type in angle brackets is refused
addGrams<number>(500, 125)
// @ts-expect-error: tinTitle has no type parameter, so a type in angle brackets is refused
tinTitle<string>('Morning Keemun')
// @ts-expect-error: grams written as text are refused
addGrams('500', 125)
// @ts-expect-error: a blend is text, not a number
tinTitle(500)
