import {
  broken,
  checkCases,
  dilys,
  errorCode,
  findLeak,
  hashParts,
  hasMessage,
  isJson,
  kofi,
  noLeaks,
  notImplemented,
  people,
  publicOf,
  same,
  sandbox,
  seed,
  sunniva
} from '../../shared/checks-lib.mjs'

const signIn = (json) => ({ method: 'POST', path: '/sign-in', json })
const options = { workshops: seed, staff: people, staffKey: 'check-key-7' }
const passwords = people.map((p) => p.password)

export const leakMessages = {
  password:
    'A password showed up where it should not. Anyone who can read the log, or the answer, could sign in as that person. Say what happened, and never repeat what was typed.',
  hash: 'A password hash showed up where it should not. With the hash, a password can be guessed on any computer, as fast as it can try, without ever asking the API.'
}

export const checks = {
  async check(t) {
    const attempts = [
      {
        name: 'The right password returns the member',
        email: kofi.email,
        password: kofi.password,
        want: publicOf(kofi, 1)
      },
      {
        name: 'A wrong password returns null',
        email: kofi.email,
        password: 'lemon-slip-24',
        want: null
      },
      {
        name: "Someone else's password returns null",
        email: sunniva.email,
        password: kofi.password,
        want: null
      },
      {
        name: 'An email nobody has returns null',
        email: 'nobody@studio.test',
        password: kofi.password,
        want: null
      },
      {
        name: 'The email is found whatever its case',
        email: 'Dilys.M@Studio.test',
        password: dilys.password,
        want: publicOf(dilys, 3)
      }
    ]
    const r = await t.call(await sandbox(t), '.grader/harness.mjs', 'signIns', [
      people,
      attempts.map(({ email, password }) => ({ email, password }))
    ])
    if (!r.ok) return broken('checkSignIn can be called', r.error)
    const { runs, hashes } = r.value
    const unwritten = runs.find((run) => notImplemented(run.thrown))
    if (unwritten) return broken('checkSignIn is written', unwritten.thrown)
    const call = (a) =>
      `checkSignIn(staff, ${JSON.stringify(a.email)}, ${JSON.stringify(a.password)})`
    const told = (a, run) =>
      `${call(a)}\n${run.thrown ? `threw ${run.thrown}` : `returned ${JSON.stringify(run.value)}`}`
    const details = attempts.map((a, i) => {
      const run = runs[i]
      const passed = !run.thrown && same(run.value, a.want)
      let message
      if (run.thrown) message = 'checkSignIn threw an error. Read it below.'
      else if (a.want && run.value === null)
        message =
          i === 4 && same(runs[0].value, attempts[0].want)
            ? "The member was not found when the email was typed in other capitals. Look up the email with the store's own findByEmail(), which ignores case."
            : 'The right password gave null. Look at how the member is found and how the password is checked against their passwordHash.'
      else if (a.want)
        message =
          'The right password should return the member as { id, name, email, role }, with nothing else in it.'
      else message = 'This should give null, so nobody signs in without their own password.'
      return { name: a.name, passed, message: passed ? undefined : message, output: told(a, run) }
    })
    const leak = runs.findIndex((run) =>
      findLeak(
        [{ where: 'it', text: JSON.stringify(run.value) }],
        hashParts(hashes).map((value) => ({ kind: 'hash', value }))
      )
    )
    details.push({
      name: 'It never returns the password hash',
      passed: leak === -1,
      message:
        leak === -1
          ? undefined
          : 'What checkSignIn returns goes into the answer. It should leave out the passwordHash.',
      output: leak === -1 ? 'No hash in what it returned.' : told(attempts[leak], runs[leak])
    })
    const wrong = runs[1].calls.scrypt
    const unknown = runs[3].calls.scrypt
    const even = !runs[1].thrown && !runs[3].thrown && unknown > 0 && unknown === wrong
    details.push({
      name: 'An unknown email takes as long as a wrong password',
      passed: even,
      message: even
        ? undefined
        : wrong === 0 && unknown === 0
          ? 'Neither a wrong password nor an unknown email was hashed, so no password was really checked against a hash. Look at how the typed password is checked.'
          : unknown === 0
            ? 'For an email nobody has, your function answered without hashing anything, so it answers far sooner than for a wrong password. Someone timing the answers can tell which emails belong to staff.'
            : 'An email nobody has and a wrong password did a different amount of hashing, so one answers sooner than the other, and the time gives away which emails belong to staff.',
      output: `${call(attempts[1])} hashed ${wrong} time(s).\n${call(attempts[3])} hashed ${unknown} time(s).`
    })
    return details
  },

  async route(t) {
    const right = signIn({ email: kofi.email, password: kofi.password })
    const wrong = signIn({ email: kofi.email, password: 'lemon-slip-24' })
    const unknown = signIn({ email: 'nobody@studio.test', password: kofi.password })
    const refused = (res) =>
      res.status === 401 && isJson(res) && errorCode(res) === 'wrong_sign_in' && hasMessage(res)
    const bad = (res) => res.status === 400 && errorCode(res) === 'bad_sign_in' && hasMessage(res)
    const unmounted = (r) =>
      r.res.status === 404 && errorCode(r.res) === 'not_found'
        ? 'Nothing answered POST /sign-in. Look at whether createApp mounts the sign-in router, and whether it comes before the 404 catch-all.'
        : undefined
    const { details } = await checkCases(
      t,
      [
        {
          name: 'The right password answers 200 with the member',
          requests: [right],
          ok: (r) =>
            r.res.status === 200 && isJson(r.res) && same(r.res.json, { staff: publicOf(kofi, 1) }),
          hint: (r) =>
            unmounted(r) ??
            'The right email and password should answer 200 with { staff: { id, name, email, role } } and nothing else.'
        },
        {
          name: 'A wrong password answers 401',
          requests: [wrong],
          ok: (r) => refused(r.res),
          hint: (r) =>
            unmounted(r) ??
            "A wrong password should answer 401 with { error: { code: 'wrong_sign_in', message } }."
        },
        {
          name: 'An unknown email gets the very same answer',
          requests: [wrong, unknown],
          ok: (r) =>
            refused(r.responses[0]) && r.res.status === 401 && r.res.text === r.responses[0].text,
          hint: (r) =>
            unmounted(r) ??
            'A wrong password and an email nobody has should get exactly the same status and body. Any difference tells a stranger which emails belong to staff.'
        },
        {
          name: 'A missing password answers 400',
          requests: [signIn({ email: kofi.email })],
          ok: (r) => bad(r.res),
          hint: (r) =>
            unmounted(r) ??
            "A body without a password should answer 400 with { error: { code: 'bad_sign_in', message } }."
        },
        {
          name: 'A password that is not text answers 400',
          requests: [signIn({ email: kofi.email, password: 4242 })],
          ok: (r) => bad(r.res),
          hint: (r) =>
            unmounted(r) ?? 'The email and the password must both be text. A number is not.'
        },
        {
          name: 'An empty email answers 400',
          requests: [signIn({ email: '', password: kofi.password })],
          ok: (r) => bad(r.res),
          hint: (r) =>
            unmounted(r) ??
            'An empty email is not an email. It should answer 400 with the code bad_sign_in.'
        },
        {
          name: 'A request with no body answers 400',
          requests: [{ method: 'POST', path: '/sign-in' }],
          ok: (r) => bad(r.res),
          hint: (r) =>
            unmounted(r) ??
            'A POST with no body should answer 400 too. Look at what req.body is when nothing was sent.'
        },
        {
          name: 'The rest of the API still answers',
          requests: [{ path: '/workshops/12' }, { method: 'POST', path: '/kilns' }],
          ok: (r) =>
            r.responses[0].status === 200 &&
            r.res.status === 404 &&
            errorCode(r.res) === 'not_found',
          hint: 'Workshops should still be read, and a path nobody answers should still get the JSON 404.'
        }
      ],
      options,
      ['src/signIn.js']
    )
    return details
  },

  async log(t) {
    const list = [
      {
        name: 'A sign-in that works is logged with its email',
        email: kofi.email,
        password: kofi.password
      },
      {
        name: 'A wrong password is logged with its email',
        email: sunniva.email,
        password: 'oxide-blue-78'
      },
      {
        name: 'An unknown email is logged with that email',
        email: 'nobody@studio.test',
        password: dilys.password
      }
    ].map((c) => ({ ...c, requests: [signIn({ email: c.email, password: c.password })] }))
    const quiet = [
      { name: 'A body without an email', requests: [signIn({ password: kofi.password })] },
      {
        name: 'A body that is not JSON',
        requests: [{ method: 'POST', path: '/sign-in', body: `{"password": "${dilys.password}"` }]
      }
    ]
    const cases = [...list, ...quiet].map((c) => ({ ...c, ok: () => true, hint: '' }))
    const { details, runs, hashes } = await checkCases(t, cases, options, ['src/signIn.js'])
    if (!runs) return details
    if (runs[0].res?.status !== 200) {
      return [
        {
          name: 'The sign-in route works',
          passed: false,
          message:
            'The sign-in route does not answer the right password with 200 yet, so its log cannot be checked. Finish the task Add the sign-in route first.',
          output: details[0].output
        }
      ]
    }
    const lines = list.map((c, i) =>
      runs[i].out.split('\n').filter((line) => line.includes(c.email))
    )
    const result = list.map((c, i) => ({
      name: c.name,
      passed: lines[i].length > 0,
      message:
        lines[i].length > 0
          ? undefined
          : 'No line with this email was logged. The studio still needs to see who tried to sign in. Log a line for every attempt.',
      output: `${details[i].output}\n\nThe app printed:\n${runs[i].out.trim() || '(nothing)'}`
    }))
    const shape = (i) =>
      lines[i].map((line) => line.replaceAll(list[i].email, '<email>')).join('\n')
    const differs = lines[0].length > 0 && lines[1].length > 0 && shape(0) !== shape(1)
    result.push({
      name: 'The line says how it ended',
      passed: differs,
      message: differs
        ? undefined
        : lines[0].length === 0 || lines[1].length === 0
          ? 'Log a line for every attempt first; then this is checked.'
          : 'A sign-in that worked and one that was refused logged the same line. Say in the line how the attempt ended.',
      output: `Signed in:\n${lines[0].join('\n') || '(no line)'}\n\nRefused:\n${lines[1].join('\n') || '(no line)'}`
    })
    const secrets = [
      ...passwords.map((value) => ({ kind: 'password', value })),
      { kind: 'password', value: 'oxide-blue-78' },
      ...hashParts(hashes).map((value) => ({ kind: 'hash', value }))
    ]
    result.push(
      noLeaks(
        'No password or hash reaches a log or an answer',
        cases,
        runs,
        () => secrets,
        leakMessages
      )
    )
    return result
  }
}
