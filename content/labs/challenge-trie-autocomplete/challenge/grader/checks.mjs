import { isDeepStrictEqual } from 'node:util'
import { workload } from './workload.mjs'
import { Trie } from '../solution/src/trie.ts'

const FILE = 'src/trie.ts'
const WORDS = 150000
const LIMIT_MS = 2500

const times = (n, method, word) => Array.from({ length: n }, () => [method, word])

async function runScenarios(t, scenarios, extra = []) {
  const dir = await t.sandbox({
    '.grader/drive.mjs': t.chapterPath('grader/drive.mjs'),
    '.grader/workload.mjs': t.chapterPath('grader/workload.mjs')
  })
  const [runs, types, ...extras] = await Promise.all([
    Promise.all(scenarios.map((s) => t.call(dir, '.grader/drive.mjs', 'replay', [s.steps]))),
    t.typecheck(dir, [FILE]),
    ...extra.map((run) => run(t, dir))
  ])
  const unwritten = runs.find((r) => !r.ok && /Not implemented/.test(r.error))
  if (unwritten) {
    return [
      {
        name: 'Trie is implemented',
        passed: false,
        message: `A method this task needs still throws 'Not implemented'. Replace those lines in ${FILE} with your code.`,
        output: unwritten.error
      }
    ]
  }
  return [
    ...scenarios.map((s, i) => {
      const r = runs[i]
      const passed = r.ok && isDeepStrictEqual(r.value, s.expected)
      const lines = s.steps.map(([method, ...args], j) => {
        const call = method === 'nodeCount' ? 'nodeCount' : `${method}(${args.map((a) => JSON.stringify(a)).join(', ')})`
        const got = r.ok ? JSON.stringify(r.value[j] ?? null) : '?'
        return s.expected[j] === null ? call : `${call} -> ${got}${got === JSON.stringify(s.expected[j]) ? '' : `  (expected ${JSON.stringify(s.expected[j])})`}`
      })
      return {
        name: s.name,
        passed,
        message: passed ? undefined : r.ok ? s.hint : `Your code threw an error in this scenario. ${s.hint}`,
        output: r.ok ? lines.join('\n') : `${lines.join('\n')}\n${r.error}`
      }
    }),
    ...extras,
    {
      name: `${FILE} type-checks`,
      passed: types.passed,
      message: types.passed ? undefined : `TypeScript reports errors in ${FILE}. Remember that Node runs it directly: no enums, no parameter properties.`,
      output: types.output
    }
  ]
}

async function largeCheck(t, dir) {
  const { ms, ...expected } = workload(Trie, WORDS)
  const r = await t.call(dir, '.grader/drive.mjs', 'large', [WORDS], { timeoutMs: 12000 })
  const { ms: took, ...got } = r.ok ? r.value : {}
  const right = r.ok && isDeepStrictEqual(got, expected)
  const fast = r.ok && took <= LIMIT_MS
  const what = !r.ok
    ? null
    : got.hits !== expected.hits
      ? 'has or startsWith answered differently'
      : got.suggestions !== expected.suggestions
        ? 'topK returned different suggestions'
        : got.deleted !== expected.deleted
          ? 'delete reported a different number of removed words'
          : got.after !== expected.after
            ? 'topK after the deletes returned different suggestions'
            : got.nodes !== got.freshNodes
              ? 'nodeCount after the deletes is larger than a fresh trie with the same words, so some unused nodes were kept'
              : 'nodeCount differs from a correct trie'
  return {
    name: `Stays fast with ${WORDS} words`,
    passed: right && fast,
    message: !r.ok
      ? 'The large run did not finish. An operation probably looks at every stored word instead of walking down the letters of the word or prefix.'
      : !right
        ? `The large run finished, but ${what}. The small scenarios above may show the same problem on fewer words.`
        : !fast
          ? `The large run took ${took} ms. An operation probably looks at every stored word instead of walking down the letters of the word or prefix.`
          : undefined,
    output: r.ok
      ? `${WORDS} words inserted, 60,000 has and startsWith calls, 2,200 topK calls, ${expected.deleted} deletes\n` +
        `got ${JSON.stringify(got)}\nexpected ${JSON.stringify(expected)}\n${took} ms (limit ${LIMIT_MS} ms)`
      : r.error
  }
}

export const checks = {
  basics(t) {
    return runScenarios(t, [
      {
        name: 'has finds whole words only',
        steps: [['insert', 'apple'], ['has', 'apple'], ['has', 'app'], ['has', 'apples']],
        expected: [null, true, false, false],
        hint: 'A word is stored only if it was inserted. Walking down to a node is not enough: that node has to mark the end of a word.'
      },
      {
        name: 'startsWith finds prefixes',
        steps: [['insert', 'apple'], ['startsWith', 'app'], ['startsWith', 'apple'], ['startsWith', 'apl'], ['startsWith', 'applesauce']],
        expected: [null, true, true, false, false],
        hint: 'startsWith is true when every letter of the prefix can be followed down from the root.'
      },
      {
        name: 'A word can be a prefix of another',
        steps: [['insert', 'apple'], ['insert', 'app'], ['has', 'app'], ['has', 'appl'], ['has', 'apple']],
        expected: [null, null, true, false, true],
        hint: 'Inserting a short word whose letters already exist must still mark where it ends.'
      },
      {
        name: 'An empty trie holds nothing',
        steps: [['has', 'a'], ['startsWith', 'a'], ['startsWith', '']],
        expected: [false, false, false],
        hint: 'With no words stored, every question is answered with false, even for the empty prefix.'
      },
      {
        name: 'The empty string',
        steps: [['insert', ''], ['has', ''], ['startsWith', ''], ['insert', 'go'], ['startsWith', ''], ['has', '']],
        expected: [null, false, false, null, true, false],
        hint: "insert('') is ignored and has('') is false. startsWith('') is true once any word is stored."
      },
      {
        name: 'Inserting a word twice is harmless',
        steps: [['insert', 'go'], ['insert', 'go'], ['has', 'go'], ['has', 'g']],
        expected: [null, null, true, false],
        hint: 'A repeated insert should leave the word stored, without creating anything new.'
      }
    ])
  },

  topk(t) {
    return runScenarios(t, [
      {
        name: 'Ranks completions by frequency',
        steps: [...times(3, 'insert', 'car'), ['insert', 'cat'], ...times(2, 'insert', 'cart'), ['topK', 'ca', 3]],
        expected: [null, null, null, null, null, null, ['car', 'cart', 'cat']],
        hint: 'Each insert of the same word adds 1 to its frequency. More frequent words come first.'
      },
      {
        name: 'Breaks ties in string order',
        steps: [['insert', 'dot'], ['insert', 'dog'], ['insert', 'door'], ['topK', 'do', 2]],
        expected: [null, null, null, ['dog', 'door']],
        hint: 'Words with the same frequency are ordered with plain string comparison, whatever order they were inserted in.'
      },
      {
        name: 'Frequency comes before string order',
        steps: [...times(2, 'insert', 'b'), ...times(2, 'insert', 'a'), ...times(3, 'insert', 'c'), ['topK', '', 3]],
        expected: [null, null, null, null, null, null, null, ['c', 'a', 'b']],
        hint: 'Sort by frequency, highest first, and only use string order between words with equal frequency. An empty prefix matches every word.'
      },
      {
        name: 'The prefix itself can be a completion',
        steps: [...times(2, 'insert', 'app'), ['insert', 'apple'], ['topK', 'app', 5]],
        expected: [null, null, null, ['app', 'apple']],
        hint: 'Start collecting at the node for the prefix, and include that node when a word ends there.'
      },
      {
        name: 'Handles k larger than the matches, k of 0 and no matches',
        steps: [['insert', 'cat'], ['insert', 'cab'], ['topK', 'ca', 10], ['topK', 'ca', 0], ['topK', 'zz', 3], ['topK', 'cat', 1]],
        expected: [null, null, ['cab', 'cat'], [], [], ['cat']],
        hint: 'Return what you have when there are fewer than k matches, an empty list for k of 0, and an empty list when no word has the prefix.'
      },
      {
        name: 'topK does not change frequencies',
        steps: [['insert', 'tea'], ['insert', 'ten'], ['insert', 'ten'], ['topK', 'te', 2], ['topK', 'te', 2]],
        expected: [null, null, null, ['ten', 'tea'], ['ten', 'tea']],
        hint: 'Asking for suggestions should not count as using a word.'
      }
    ])
  },

  delete(t) {
    return runScenarios(
      t,
      [
        {
          name: 'delete removes a word and its nodes',
          steps: [['insert', 'cat'], ['nodeCount'], ['delete', 'cat'], ['has', 'cat'], ['startsWith', 'c'], ['nodeCount']],
          expected: [null, 4, true, false, false, 1],
          hint: 'After the only word is deleted, every node except the root is unused and should be removed.'
        },
        {
          name: 'delete of a missing word changes nothing',
          steps: [['insert', 'cat'], ['delete', 'ca'], ['delete', 'dog'], ['delete', 'cats'], ['has', 'cat'], ['nodeCount']],
          expected: [null, false, false, false, true, 4],
          hint: 'delete returns false for a word that was never stored, including a prefix of a stored word, and must not remove anything.'
        },
        {
          name: 'Deleting a short word keeps longer ones',
          steps: [['insert', 'car'], ['insert', 'cart'], ['delete', 'car'], ['has', 'car'], ['has', 'cart'], ['nodeCount']],
          expected: [null, null, true, false, true, 5],
          hint: "Nodes on the way to 'cart' are still needed. Only the end-of-word mark of 'car' goes."
        },
        {
          name: 'Deleting a long word prunes back to the shared part',
          steps: [['insert', 'car'], ['insert', 'cart'], ['delete', 'cart'], ['startsWith', 'cart'], ['has', 'car'], ['nodeCount']],
          expected: [null, null, true, false, true, 4],
          hint: 'Walk back up from the end of the word and remove nodes until you reach one that ends a word or has other children.'
        },
        {
          name: 'Pruning stops at a branch',
          steps: [['insert', 'tea'], ['insert', 'ten'], ['insert', 'to'], ['nodeCount'], ['delete', 'ten'], ['nodeCount'], ['delete', 'to'], ['nodeCount'], ['delete', 'tea'], ['nodeCount']],
          expected: [null, null, null, 6, true, 5, true, 4, true, 1],
          hint: 'A node with another child is still in use. Count the nodes after each delete on paper and compare.'
        },
        {
          name: 'A deleted word starts over',
          steps: [...times(3, 'insert', 'go'), ...times(2, 'insert', 'gone'), ['delete', 'go'], ['insert', 'go'], ['topK', 'go', 2]],
          expected: [null, null, null, null, null, true, null, ['gone', 'go']],
          hint: 'delete removes the word whatever its frequency. Inserting it again starts its frequency from 1.'
        }
      ],
      [largeCheck]
    )
  }
}
