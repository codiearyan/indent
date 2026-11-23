import { judgeCall } from '../../grading.mjs'

const FILE = 'src/intake.cpp'
const question = {
  name: 'question',
  what: 'the question',
  type: 'std::string',
  const: true,
  want: 'const std::string&'
}
const asked = (q) => (out) => out === q || out === `${q}\n`
const NOT_A_NUMBER = 'That is not a number.'

export const checks = {
  number(t) {
    const cases = [
      ['Days promised: ', '6\n', 6],
      ['Ticket number: ', '  3051\n', 3051],
      ['Clocks today: ', '14\n', 14]
    ]
    return judgeCall(t, {
      file: FILE,
      task: 1,
      fn: 'askNumber',
      returns: 'int',
      params: [question],
      typed:
        'Check typed other numbers and askNumber gave back the same each time. Give back the number read from std::cin.',
      cases: cases.map(([q, input, want]) => ({
        name: `${JSON.stringify(q)}, then ${input.trim()} typed`,
        args: [q],
        input,
        expect: { result: want, printed: asked(q) },
        hint: (r) =>
          r.result !== want
            ? 'askNumber does not give back the number that was typed. Read it from std::cin into an int with >>, and give that back.'
            : r.stdout === ''
              ? 'askNumber gives back the right number, but it does not print the question first, so Dorrit would not know what to type.'
              : 'askNumber does not print the question as it is given. Print the question itself, with nothing added in front of it.'
      }))
    })
  },

  line(t) {
    const cases = [
      ['Customer: ', 'Philippa Garrow\n', 'Philippa Garrow'],
      ['Item: ', 'long case clock\n', 'long case clock'],
      ['Customer: ', 'Leopold\n', 'Leopold']
    ]
    return judgeCall(t, {
      file: FILE,
      task: 2,
      fn: 'askLine',
      returns: 'std::string',
      params: [question],
      typed:
        'Check typed other lines and askLine gave back the same each time. Give back the line read from std::cin.',
      cases: cases.map(([q, input, want]) => ({
        name: `${JSON.stringify(q)}, then "${want}" typed`,
        args: [q],
        input,
        expect: { result: want, printed: asked(q) },
        hint: (r) =>
          r.result !== want && r.result === want.split(' ')[0]
            ? 'askLine gives back only the first word. >> stops at the first space; a whole line, spaces included, is read another way.'
            : r.result !== want
              ? 'askLine does not give back the whole line that was typed.'
              : r.stdout === ''
                ? 'askLine gives back the right line, but it does not print the question first.'
                : 'askLine does not print the question as it is given.'
      }))
    })
  },

  repair(t) {
    const cases = [
      ['2\ncarriage clock\n', 2, 'carriage clock'],
      ['1\nwatch\n', 1, 'watch'],
      ['3\nlong case clock\n', 3, 'long case clock']
    ]
    return judgeCall(t, {
      file: FILE,
      task: 3,
      fn: 'askRepair',
      returns: 'void',
      params: [
        { name: 'clocks', what: 'the clocks', type: 'int', after: true },
        { name: 'item', what: 'the item', type: 'std::string', after: true }
      ],
      cases: cases.map(([input, clocks, item]) => ({
        name: `${clocks} and "${item}" typed`,
        args: [0, 'nothing yet'],
        input,
        expect: { args: [clocks, item], printed: (out) => /^Clocks: \n?Item: \n?$/.test(out) },
        hint: (r) =>
          r.args[0] === 0 && r.args[1] === 'nothing yet'
            ? "Check's own clocks and item did not change. askRepair changed copies of them: a parameter is a copy of what the caller passed, unless it is a reference."
            : r.args[0] !== clocks
              ? 'The clocks afterwards are not the number that was typed first.'
              : r.args[1] === ''
                ? 'The item came back empty. After the number, the Enter that followed it is still waiting, and a read of a whole line stops at the first line end it meets.'
                : r.args[1] !== item && r.args[1] === item.split(' ')[0]
                  ? 'The item is only its first word. >> stops at the first space; a whole line, spaces included, is read another way.'
                  : r.args[1] !== item
                    ? 'The item afterwards is not the line that was typed after the number.'
                    : 'askRepair does not print the two questions as the task writes them: "Clocks: " before it reads the number and "Item: " before it reads the item, each with a space after the colon and no line end, so Dorrit types on the same line.'
      }))
    })
  },

  quantity(t) {
    const cases = [
      ['How many? ', 'lots\n3\n', 3, 1],
      ['Days promised: ', 'two days\n4\n', 4, 1],
      ['How many? ', '5\n', 5, 0],
      ['Clocks: ', 'none\nsome\n6\n', 6, 2]
    ]
    return judgeCall(t, {
      file: FILE,
      task: 4,
      fn: 'askQuantity',
      returns: 'int',
      params: [question],
      stuck:
        'askQuantity went round without end after text that is not a number, so Check stopped it. When a read with >> fails, std::cin refuses every read after it until it is told to go on, and the text it could not read is still waiting.',
      cases: cases.map(([q, input, want, wrong]) => {
        const said = (out) => out.split(NOT_A_NUMBER).length - 1
        const questions = (out) => out.split(q.trim()).length - 1
        return {
          name:
            wrong === 0
              ? `${JSON.stringify(q)}, then a number typed`
              : `${JSON.stringify(q)}, then ${input
                  .split('\n')
                  .slice(0, wrong)
                  .map((l) => `"${l}"`)
                  .join(' and ')}, then a number`,
          args: [q],
          input,
          expect: {
            result: want,
            printed: (out) => said(out) === wrong && questions(out) === wrong + 1
          },
          hint: (r) =>
            r.result !== want
              ? wrong
                ? `askQuantity does not give back the number typed after ${wrong === 1 ? 'the line that is not a number' : 'the lines that are not numbers'}. It asks again until it reads a number, and gives that one back.`
                : 'askQuantity does not give back the number that was typed.'
              : said(r.stdout) > wrong
                ? `"${NOT_A_NUMBER}" is printed more times than there were lines that are not numbers. After a failed read, the whole rest of that line has to go before asking again.`
                : said(r.stdout) < wrong
                  ? `"${NOT_A_NUMBER}" is not printed once for each line that is not a number.`
                  : 'askQuantity does not print the question once each time it asks.'
        }
      })
    })
  }
}
