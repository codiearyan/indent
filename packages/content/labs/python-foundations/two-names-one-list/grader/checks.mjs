import { dataCases } from '../../grading.mjs'

const FILE = 'search_board.py'

const count = (list, x) => list.filter((s) => s === x).length

/** What a for loop that removes items from the list it goes through leaves behind. */
function skipped(squares, searched) {
  const left = [...squares]
  for (let i = 0; i < left.length; i++) if (searched.includes(left[i])) left.splice(i, 1)
  return left
}

export const checks = {
  added(t) {
    const list = [
      ['Three squares', ['A1', 'A2', 'B1'], 'F3'],
      ['One square', ['C7'], 'C8'],
      ['No squares yet', [], 'G2']
    ]
    return dataCases(t, {
      file: FILE,
      task: 1,
      fn: 'with_square',
      typed:
        'with_square gives back the same list whatever Check gives it. Make it from the list and the square it is given.',
      list: list.map(([name, squares, square]) => ({
        name,
        args: [squares, square],
        expected: [...squares, square],
        hint: (v) =>
          Array.isArray(v.data) && v.data[0] === square
            ? 'with_square puts the new square at the front. It goes at the end.'
            : 'with_square does not give back the squares it is given with the new one at the end.'
      }))
    })
  },

  crossed(t) {
    const list = [
      ['A square in the middle', ['A1', 'A2', 'B1', 'B2'], 'A2'],
      ['A square not on the list', ['C5', 'C6'], 'D9'],
      ['The only square', ['E4'], 'E4']
    ]
    return dataCases(t, {
      file: FILE,
      task: 2,
      fn: 'cross_off',
      list: list.map(([name, squares, square]) => ({
        name,
        args: [squares, square],
        after: { 0: squares.filter((s) => s !== square) },
        afterHint: (held) =>
          held.includes(square)
            ? `${square} is still on the list after the call.`
            : 'The list lost a square that was not crossed off. Only the square cross_off is given comes out.'
      }))
    })
  },

  draft(t) {
    const list = [
      ['A square at the end', ['A1', 'A2', 'B1'], 'B1'],
      ['A square in the middle', ['C5', 'C6', 'D1', 'D2'], 'C6'],
      ['A square first already', ['E4', 'E5'], 'E4']
    ]
    return dataCases(t, {
      file: FILE,
      task: 3,
      fn: 'draft_order',
      typed:
        'draft_order gives back the same list whatever Check gives it. Make it from the list and the square it is given.',
      list: list.map(([name, squares, first]) => ({
        name,
        args: [squares, first],
        expected: [first, ...squares.filter((s) => s !== first)],
        fresh:
          'draft_order gives back the board it was given, under a second name, not a copy, so a change made to the draft later would change the board too. Give back a copy, even when the square is first already.',
        hint: (v) => {
          const got = Array.isArray(v.data) ? v.data : []
          if (count(got, first) > 1)
            return `${first} is in the draft twice. It moves to the front, so it is no longer where it was.`
          if (count(got, first) === 0) return `${first} is not in the draft at all. It moves to the front.`
          if (got.at(-1) === first && got.length > 1) return `${first} is at the end of the draft. It goes to the front.`
          return 'draft_order does not give back the squares with that one first and the others in their old order.'
        }
      }))
    })
  },

  cleared(t) {
    const list = [
      ['Two searched side by side', ['A1', 'A2', 'A3', 'B1', 'B2'], ['A2', 'A3']],
      ['Every square searched', ['C1', 'C2', 'C3'], ['C3', 'C2', 'C1']],
      ['One searched, at the end', ['D4', 'D5', 'D6'], ['D6']],
      ['A searched square not on the board', ['E1', 'E2'], ['F9', 'E1']]
    ]
    return dataCases(t, {
      file: FILE,
      task: 4,
      fn: 'clear_searched',
      mistakes: [
        {
          after: (c) => skipped(c.args[0], c.args[1]),
          hint: 'Some searched squares are still on the list, and each one came right after a square that was taken out. Taking items out of a list while a for loop goes through that same list moves the rest along one place, so the loop skips the item after each one it takes out. The loop has to go through something that does not change.'
        }
      ],
      list: list.map(([name, squares, searched]) => ({
        name,
        args: [squares, searched],
        after: { 0: squares.filter((s) => !searched.includes(s)) },
        afterHint: (held) =>
          held.some((s) => searched.includes(s))
            ? 'Some squares that were searched are still on the list after the call.'
            : 'The list lost a square that was not searched. Only the searched squares come out.'
      }))
    })
  }
}
