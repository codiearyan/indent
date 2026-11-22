import { judge, runTests, fileProblem, workingCode, wrongVersion } from '../../grading.mjs'

const test = 'src/weekly.test.js'
const target = 'src/weekly.js'

const PAUSE = "  if (subscription.pausedWeeks.includes(week)) return null\n"
const FORTNIGHT = "  if (subscription.every === 'fortnight' && week % 2 === 1) return null\n"
const CHANGE = 'subscription.sizeChanges[week] ?? subscription.size'

const rules = {
  pause: {
    about: 'paused weeks',
    task: 'Test a paused week',
    words: 'pause or paused',
    name: /paus/i,
    wrong: [
      {
        label: 'ignores paused weeks',
        change: [PAUSE, ''],
        hint: 'Give a subscriber a paused week, and check that week.'
      }
    ]
  },
  fortnight: {
    about: 'fortnightly boxes',
    task: 'Test a fortnightly box',
    words: 'fortnight or fortnightly',
    name: /fortnight/i,
    wrong: [
      {
        label: 'sends fortnightly subscribers a box every week',
        change: [FORTNIGHT, ''],
        hint: 'Use a fortnightly subscriber and check an odd week.'
      },
      {
        label: 'skips the even weeks instead of the odd ones',
        change: [FORTNIGHT, FORTNIGHT.replace('=== 1', '=== 0')],
        hint: 'Use a fortnightly subscriber and check an odd week.'
      }
    ]
  },
  change: {
    about: 'size changes',
    task: 'Test a size change for one week',
    words: 'change or changed',
    name: /chang/i,
    wrong: [
      {
        label: 'ignores the size change',
        change: [CHANGE, 'subscription.size'],
        hint: 'Give a subscriber a size change for one week, and check that week.'
      },
      {
        label: 'keeps the changed size for every week',
        change: [CHANGE, 'Object.values(subscription.sizeChanges)[0] ?? subscription.size'],
        hint: 'Also check a week without a change: it should get the usual size.'
      }
    ]
  }
}

const inGroup = (x) => x.group[0] === 'weeklyBox'

const ruleTask = (key) => (t) => {
  const rule = rules[key]
  return judge(t, {
    test,
    target,
    pick: (x) => inGroup(x) && rule.name.test(x.name),
    where: `about ${rule.about} in the weeklyBox block`,
    missing: `Check finds no test about ${rule.about} in describe('weeklyBox') yet. It looks for a test inside that block whose name says ${rule.words}.`,
    wrong: rule.wrong
  })
}

export const checks = {
  pause: ruleTask('pause'),
  fortnight: ruleTask('fortnight'),
  change: ruleTask('change'),

  async 'one-rule'(t) {
    const code = await workingCode(t, target)
    const keys = Object.keys(rules)
    const [good, ...runs] = await Promise.all([
      runTests(t, { test, target, code }),
      ...keys.map((key) => runTests(t, { test, target, code: wrongVersion(code, rules[key].wrong[0].change) }))
    ])
    const problem = fileProblem(test, good)
    if (problem) return [problem]
    const name = (x) => [...x.group, x.name].join(' > ')
    const passing = good.tests.filter((x) => x.status === 'passed')
    const failedOn = runs.map((run) => new Set(run.tests.filter((x) => x.status !== 'passed').map(name)))
    const rulesBroken = (x) => keys.filter((_, i) => failedOn[i].has(name(x)))
    return keys.map((key, i) => {
      const rule = rules[key]
      const caught = passing.filter((x) => failedOn[i].has(name(x)))
      const unnamed = caught.find((x) => !rule.name.test(x.name))
      const mixed = caught.find((x) => rulesBroken(x).length > 1)
      const passed = caught.length > 0 && !unnamed && !mixed
      const others = mixed && rulesBroken(mixed).map((k) => rules[k].about)
      return {
        name: `When the rule for ${rule.about} breaks, only tests about ${rule.about} fail`,
        passed,
        message: passed
          ? undefined
          : caught.length === 0
            ? `No passing test fails yet when the rule for ${rule.about} breaks. Finish the task "${rule.task}" first.`
            : unnamed
              ? `When the rule for ${rule.about} breaks, "${unnamed.name}" fails too, and its name does not say it is about ${rule.about}. Give each rule a test of its own that says which rule it checks, and take that rule's checks out of tests about something else.`
              : `"${mixed.name}" fails when ${others.map((o) => `the rule for ${o} breaks`).join(' and also when ')}, so it checks more than one rule. Split it into one test per rule.`,
        output: caught.length
          ? `On a version that ${rule.wrong[0].label}, these failed:\n${caught.map((x) => `  ${name(x)}`).join('\n')}`
          : undefined
      }
    })
  }
}
