import { numbered } from '../src/offers.ts'

// @ts-expect-error: a callback that gives back the position, a number, is refused
numbered(['Frost Sencha'], (line, at) => at)
// @ts-expect-error: a callback whose line is a number is refused
numbered(['Frost Sencha'], (line: number) => '')
// @ts-expect-error: numbered passes two values, so a callback that needs a third is refused
numbered(['Frost Sencha'], (line: string, at: number, total: number) => line)
