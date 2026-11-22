import { describe, expect, it } from 'vitest'
import { parseCard } from './cards'

const part = (title: string): { title: string; text: string } => ({ title, text: `About ${title}` })

describe('parseCard', () => {
  it('reads each kind of card', () => {
    expect(
      parseCard(JSON.stringify({ type: 'steps', title: 'Loop', steps: [part('a'), part('b')] }))
    ).toMatchObject({ type: 'steps', steps: [{ title: 'a' }, { title: 'b' }] })
    expect(
      parseCard(JSON.stringify({ type: 'examples', title: 'Ex', examples: [part('one')] }))
    ).toMatchObject({ type: 'examples' })
    expect(
      parseCard(
        JSON.stringify({ type: 'compare', title: 'Two ways', left: part('l'), right: part('r') })
      )
    ).toMatchObject({ type: 'compare', left: { title: 'l' }, right: { title: 'r' } })
    expect(
      parseCard(
        JSON.stringify({
          type: 'quiz',
          question: 'What prints?',
          code: 'console.log(1)',
          language: 'js',
          choices: [
            { text: '1', correct: true, why: 'It logs the number.' },
            { text: '2', correct: false, why: 'Nothing adds one.' }
          ]
        })
      )
    ).toMatchObject({ type: 'quiz', code: 'console.log(1)', choices: [{ correct: true }, {}] })
  })

  it('keeps only the fields it draws', () => {
    const card = parseCard(
      JSON.stringify({
        type: 'examples',
        title: 'Ex',
        onClick: 'alert(1)',
        examples: [{ ...part('one'), html: '<img src=x>' }]
      })
    )
    expect(card).toEqual({ type: 'examples', title: 'Ex', examples: [part('one')] })
  })

  it('refuses what does not fit a shape', () => {
    expect(parseCard('not json')).toBeNull()
    expect(parseCard('[1, 2]')).toBeNull()
    expect(parseCard(JSON.stringify({ type: 'poll', title: 'x' }))).toBeNull()
    expect(
      parseCard(JSON.stringify({ type: 'steps', title: 'One', steps: [part('a')] }))
    ).toBeNull()
    expect(
      parseCard(JSON.stringify({ type: 'steps', title: '', steps: [part('a'), part('b')] }))
    ).toBeNull()
    expect(
      parseCard(
        JSON.stringify({
          type: 'quiz',
          question: 'Which?',
          choices: [
            { text: 'a', correct: false, why: 'no' },
            { text: 'b', correct: false, why: 'no' }
          ]
        })
      )
    ).toBeNull()
    expect(
      parseCard(
        JSON.stringify({
          type: 'examples',
          title: 'Ex',
          examples: [{ ...part('x'), text: 'y'.repeat(5000) }]
        })
      )
    ).toBeNull()
  })
})
