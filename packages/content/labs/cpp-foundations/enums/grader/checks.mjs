import { bodyOf, fail, judgeType, judgeTypes } from '../../grading.mjs'

const FILE = 'src/status.cpp'
const VALUES = ['Waiting', 'OnBench', 'Ready', 'Collected']
const types = { Status: VALUES }
const statusOfCheck = { name: 'Status', task: 1, lines: ['enum class Status { Waiting, OnBench, Ready, Collected };'] }
const state = { name: 'status', what: 'the state', type: 'Status', want: 'Status' }
const S = (v) => `Status::${v}`
const WORDS = { Waiting: 'waiting for the bench', OnBench: 'on the bench', Ready: 'ready to collect', Collected: 'collected' }
const NEXT = { Waiting: 'OnBench', OnBench: 'Ready', Ready: 'Collected', Collected: 'Collected' }

export const checks = {
  status(t) {
    return judgeType(t, {
      files: [FILE],
      task: 1,
      types,
      cases: [
        {
          name: 'Status is an enum class',
          code: 'indent_::put_("enum", std::is_enum_v<Status> ? 1 : 0); indent_::put_("plain", std::is_convertible_v<Status, int> ? 1 : 0);',
          judge: (got) =>
            got.enum !== '1'
              ? 'Status is not an enum. The task asks for an enum class: enum class, its name, and its values in { }, with a semicolon after the }.'
              : got.plain === '1'
                ? 'Status is a plain enum. The task asks for an enum class: a plain enum turns its values into numbers by itself, so a state can be compared with a number by mistake, and the compiler says nothing.'
                : null,
          output: (got) => (got.enum !== '1' ? 'Status is not an enum.' : got.plain === '1' ? 'Status is a plain enum.' : 'Status is an enum class.')
        },
        {
          name: 'Status has the four states, each a value of its own',
          code: VALUES.map((v) => `indent_::put_("${v}", static_cast<int>(Status::${v}));`).join(' '),
          judge: (got) => {
            const seen = new Map()
            for (const v of VALUES) {
              if (seen.has(got[v])) return `${seen.get(got[v])} and ${v} are the same value of Status. Each state is a value of its own: give them no numbers, and the compiler numbers them one after another.`
              seen.set(got[v], v)
            }
            return null
          },
          output: () => `Check found ${VALUES.map(S).join(', ')}.`
        }
      ]
    })
  },

  collect(t) {
    return judgeTypes(t, {
      files: [FILE],
      task: 2,
      fn: 'canCollect',
      types,
      provides: [statusOfCheck],
      returns: 'bool',
      params: [state],
      typed: 'Check asked canCollect about every state and got the same answer each time. Compare the state it is given.',
      cases: VALUES.map((v) => ({
        name: `canCollect(${S(v)})`,
        args: [S(v)],
        expect: { result: v === 'Ready', printed: '' },
        hint: () =>
          v === 'Ready'
            ? 'canCollect gives back false for Status::Ready. A repair that is ready can be collected.'
            : v === 'Collected'
              ? 'canCollect gives back true for Status::Collected. That clock has gone home already: only Ready can be collected.'
              : `canCollect gives back true for ${S(v)}. Only a repair that is Ready can be collected.`
      }))
    })
  },

  async words(t) {
    const body = await bodyOf(t, FILE, 'statusText')
    if (body !== null && !/\bswitch\s*\(/.test(body)) {
      return [fail('statusText chooses with a switch', 'Task 3 asks statusText to choose the words with a switch, and Check cannot find one in it. A switch on an enum class is how the compiler can tell you when a state has no case.')]
    }
    if (body !== null && /\bdefault\s*:/.test(body)) {
      return [fail('statusText has no default', "statusText's switch has a default. With a default, a state left without a case of its own is quietly given the default's words, and the compiler no longer warns about it. Give each of the four states its own case, and no default.")]
    }
    return judgeTypes(t, {
      files: [FILE],
      task: 3,
      fn: 'statusText',
      types,
      provides: [statusOfCheck],
      returns: 'std::string',
      params: [state],
      typed: 'Check asked statusText about every state and got the same words back each time. Give each state its own words.',
      cases: VALUES.map((v, i) => ({
        name: `statusText(${S(v)})`,
        args: [S(v)],
        expect: { result: WORDS[v], printed: '' },
        hint: (r) => {
          const later = VALUES.slice(i + 1).find((w) => r.result === WORDS[w])
          if (later) return `statusText gives back the words of ${S(later)} for ${S(v)}. A case that ends without a return or a break runs on into the case below it.`
          if (r.result === '') return `statusText gives back no words for ${S(v)}. Each state has its own case, with its own words.`
          return `statusText gives back "${r.result}" for ${S(v)}, which are not the words the task gives that state.`
        }
      }))
    })
  },

  next(t) {
    return judgeTypes(t, {
      files: [FILE],
      task: 4,
      fn: 'nextStatus',
      types,
      provides: [statusOfCheck],
      returns: 'Status',
      params: [state],
      typed: 'Check asked nextStatus about every state and got the same state back each time. The state that comes next depends on the one it is given.',
      cases: VALUES.map((v) => ({
        name: `nextStatus(${S(v)})`,
        args: [S(v)],
        expect: { result: S(NEXT[v]), printed: '' },
        hint: (r) =>
          v === 'Collected'
            ? `After Collected, nextStatus gives back ${r.result}. Collected is the last state: a collected clock stays collected.`
            : r.result === S(v)
              ? `nextStatus gives back ${S(v)}, the state it was given. It gives back the one that comes after it.`
              : `nextStatus gives back ${r.result} after ${S(v)}, which is not the state that comes next.`
      }))
    })
  }
}
