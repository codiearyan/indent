import { isDeepStrictEqual } from 'node:util'

const show = (value) => JSON.stringify(value, null, 2)
const clear = (details) => details.map((d) => (d.passed ? { ...d, message: undefined } : d))

const starterFiles = (t) => ({
  'src/db.js': t.chapterPath('starter/src/db.js'),
  'src/seed.js': t.chapterPath('starter/src/seed.js'),
  '.grader/drive.mjs': t.chapterPath('grader/drive.mjs')
})

// A long secret also leaks when half of it is shown.
function pieces(secret) {
  if (typeof secret !== 'string' || secret.length < 32) return typeof secret === 'string' && secret ? [secret] : []
  const half = secret.length / 2
  return Array.from({ length: secret.length - half + 1 }, (_, i) => secret.slice(i, i + half))
}
const holds = (text, secrets) => {
  const found = secrets.flatMap(pieces).find((p) => String(text).includes(p))
  return found !== undefined
}

const forms = [
  { label: 'Greta signs in with the right password', email: 'greta@example.com', password: 'blue-heron-17', ok: 101 },
  { label: 'Cosmo mistypes a password', email: 'cosmo@example.com', password: 'tin-lantern-5' },
  { label: 'An email nobody has is refused', email: 'nobody@example.com', password: 'harbour-light-2' },
  { label: 'Yusra signs in too', email: 'yusra@example.com', password: 'quiet-orchard-9', ok: 103 }
]

const replaceToken = (text, token) =>
  typeof token === 'string' && token ? String(text).replaceAll(token, '<token>') : String(text)

export const checks = {
  async reproduce(t) {
    const dir = await t.sandbox({ ...starterFiles(t), 'src/signIn.js': t.chapterPath('starter/src/signIn.js') })
    const r = await t.call(dir, 'src/reproduce.js', 'reproduceLeak')
    if (!r.ok) {
      return [
        {
          name: 'reproduceLeak returns a result',
          passed: false,
          message: 'reproduceLeak threw instead of returning { form, log, result }. Read the error.',
          output: r.error
        }
      ]
    }
    const { form, log, result } = r.value ?? {}
    const usable =
      typeof form?.email === 'string' && typeof form?.password === 'string' && Array.isArray(log)
    const run = usable ? await t.call(dir, '.grader/drive.mjs', 'attempts', [[form]]) : undefined
    const real = run?.ok ? run.value[0] : undefined
    const same =
      real?.result !== undefined &&
      isDeepStrictEqual(
        log.map((line) => replaceToken(line, result?.token)),
        real.log.map((line) => replaceToken(line, real.result.token))
      ) &&
      isDeepStrictEqual(
        { ...result, token: result?.token === undefined ? undefined : '<token>' },
        { ...real.result, token: real.result.token === undefined ? undefined : '<token>' }
      )
    const secrets = [form?.password, result?.token, ...(real?.hashes ?? [])]
    const leaked = usable && [...log, result?.message ?? ''].some((line) => holds(line, secrets))
    return clear([
      {
        name: 'Returns the form, the log and the result',
        passed: usable,
        message: 'Return form as { email, password } with strings, log as an array of the lines signIn() logged, and result.',
        output: show(r.value)
      },
      {
        name: 'log and result are what the original signIn() gave',
        passed: usable && same,
        message:
          'log should hold every line the original signIn() logged for this form, in order, and result exactly what it returned.',
        output: `${show(r.value)}\n\nsignIn() logged and returned:\n${real?.error ?? show({ log: real?.log, result: real?.result })}`
      },
      {
        name: 'A secret shows in the log or the message',
        passed: leaked,
        message:
          'Nothing secret shows in this log or message. Look at every line for a password, a session token or a password hash.',
        output: show(r.value)
      }
    ])
  },

  async fix(t) {
    const dir = await t.sandbox(starterFiles(t))
    const run = await t.call(dir, '.grader/drive.mjs', 'attempts', [
      forms.map(({ email, password }) => ({ email, password }))
    ])
    if (!run.ok) {
      return [
        {
          name: 'signIn.js loads',
          passed: false,
          message: 'signIn.js could not be loaded. Read the error.',
          output: run.error
        }
      ]
    }
    const runs = run.value
    const call = (f) => `signIn(db, log, ${JSON.stringify({ email: f.email, password: f.password })})`
    const story = (f, r) =>
      `${call(f)}\nreturned ${r.error ?? show(r.result)}\nlogged ${show(r.log)}`
    const details = forms.map((f, i) => {
      const r = runs[i]
      const passed = f.ok
        ? r.result?.ok === true && typeof r.result.token === 'string' && r.saved === f.ok
        : r.result?.ok === false && typeof r.result.message === 'string'
      return {
        name: f.label,
        passed: !r.error && passed,
        message: r.error
          ? 'signIn threw for this attempt. Read the error: signing in must keep working with the form exactly as it was given.'
          : f.ok
            ? 'The right password should still sign in and return { ok: true, token }, with the token saved as a session.'
            : 'A wrong email or password should give { ok: false, message }.',
        output: story(f, r)
      }
    })
    const find = (pick) => {
      const i = forms.findIndex((f, j) => !runs[j].error && pick(f, runs[j]))
      return i === -1 ? undefined : story(forms[i], runs[i])
    }
    const passwordInLog = find((f, r) => r.log.some((line) => line.includes(f.password)))
    const tokenInLog = find((f, r) => r.log.some((line) => holds(line, [r.result?.token])))
    const hashOut = find((f, r) => [...r.log, r.result?.message ?? ''].some((line) => holds(line, r.hashes)))
    const passwordInMessage = find((f, r) => String(r.result?.message ?? '').includes(f.password))
    const noLine = find((f, r) => !r.log.some((line) => line.includes(f.email)))
    const everySecret = runs.flatMap((r, i) => [forms[i].password, r.result?.token, ...r.hashes])
    const printed = holds(run.stdout, everySecret)
    details.push(
      {
        name: 'No log line holds a password',
        passed: !passwordInLog,
        message:
          'A password ended up in the log. Anyone who can read the log could sign in as that customer. A log line should say what happened, not repeat what was typed.',
        output: passwordInLog
      },
      {
        name: 'No log line holds a session token',
        passed: !tokenInLog,
        message:
          'A session token, or a large part of one, ended up in the log. Whoever holds a token is signed in as that customer, with no password needed.',
        output: tokenInLog
      },
      {
        name: 'No log line or message holds a password hash',
        passed: !hashOut,
        message:
          'A password hash reached the log or the sign in page. With a hash, a short password can be found by guessing, without ever asking the portal.',
        output: hashOut
      },
      {
        name: 'The message never holds the password',
        passed: !passwordInMessage,
        message: 'The message on the sign in page repeats the password that was typed.',
        output: passwordInMessage
      },
      {
        name: 'Nothing secret is printed to the console',
        passed: !printed,
        message: 'A secret was printed to the console. On a server, the console ends up in a log too.',
        output: printed ? run.stdout : undefined
      },
      {
        name: 'Every attempt still logs a line with its email',
        passed: !noLine,
        message:
          'An attempt left no log line with its email. The team still needs to see who tried to sign in; keep the line and leave the secrets out of it.',
        output: noLine
      }
    )
    return clear(details)
  },

  test(t) {
    return t.judgeTest({
      test: 'src/signIn.test.js',
      target: 'src/signIn.js',
      wrong: 'grader/variants/hide-token-only.js',
      wrongLabel: 'a fix that keeps the token out of the log but still logs the form'
    })
  }
}
