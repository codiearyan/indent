import { randomBytes, scryptSync } from 'node:crypto'
import {
  broken,
  notImplemented,
  people,
  publicOf,
  same,
  sandbox
} from '../../shared/checks-lib.mjs'

const HEX_PAIR = /^([0-9a-f]+):([0-9a-f]+)$/i
const passwords = ['lemon-slip-42', 'Oxide blue 77', 'cone-ten-firing']

const stored = (password) => {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}
const scryptHex = (password, salt, bytes) => scryptSync(password, salt, bytes).toString('hex')
const shows = (password) =>
  [password, Buffer.from(password).toString('hex'), Buffer.from(password).toString('base64')].map(
    (form) => form.toLowerCase()
  )

function hashOf(password, value) {
  const match = typeof value === 'string' ? HEX_PAIR.exec(value) : null
  if (!match) return { form: false }
  const [, salt, hash] = match
  const bytes = hash.length / 2
  return {
    form: true,
    salt,
    hash,
    saltBytes: salt.length / 2,
    bytes,
    scrypt:
      Number.isInteger(bytes) &&
      bytes > 0 &&
      scryptHex(password, salt, bytes) === hash.toLowerCase(),
    saltAsBytes:
      Number.isInteger(bytes) &&
      bytes > 0 &&
      salt.length % 2 === 0 &&
      scryptHex(password, Buffer.from(salt, 'hex'), bytes) === hash.toLowerCase()
  }
}

export const checks = {
  async hash(t) {
    const r = await t.call(await sandbox(t), '.grader/harness.mjs', 'hashes', [passwords])
    if (!r.ok) return broken('hashPassword can be called', r.error)
    const thrown = r.value.find((x) => x.thrown)
    if (thrown) {
      return notImplemented(thrown.thrown)
        ? broken('hashPassword is written', thrown.thrown)
        : [
            {
              name: 'hashPassword returns a value',
              passed: false,
              message: 'hashPassword threw an error. Read it, then run node try.js.',
              output: thrown.thrown
            }
          ]
    }
    const runs = passwords.map((password, i) => {
      const [first, second] = r.value[i].results
      return { password, first, second, parts: hashOf(password, first) }
    })
    const line = ({ password, first, second }) =>
      `hashPassword(${JSON.stringify(password)}) gave\n${JSON.stringify(first)}\nand then\n${JSON.stringify(second)}`
    const allOutput = runs.map(line).join('\n\n')
    const firstWhere = (bad) => {
      const run = runs.find(bad)
      return run ? line(run) : allOutput
    }
    const formed = runs.every((run) => run.parts.form)
    const leaks = (run) =>
      [run.first, run.second].some((value) =>
        shows(run.password).some((form) => String(value).toLowerCase().includes(form))
      )
    const sameTwice = (run) => run.first === run.second
    const shortSalt = (run) => run.parts.saltBytes < 16
    const wrongHash = (run) => !run.parts.scrypt || run.parts.bytes !== 64
    const result = (name, bad, message) => {
      const passed = !runs.some(bad)
      return { name, passed, message: passed ? undefined : message, output: firstWhere(bad) }
    }
    const notFormed = 'First return the salt and the hash in the form the task asks for.'
    return [
      result(
        'Returns a salt and a hash, in hex',
        (run) => !run.parts.form,
        'The result should be two parts written as hex, the salt and the hash, joined by one colon. Look at the form of what you return.'
      ),
      result(
        'The password is nowhere in it',
        leaks,
        'The result still holds the password, as it was typed or only written another way. Anyone who reads the staff list could read the password back. Only a hash of it may be kept.'
      ),
      result(
        'A new salt every time',
        sameTwice,
        'The same password gave the same result twice. Then everyone who picks the same password gets the same stored value, and one guess finds them all. The salt has to be new random bytes on every call.'
      ),
      result(
        'The salt is 16 random bytes',
        (run) => !run.parts.form || shortSalt(run),
        formed
          ? 'The salt is shorter than 16 bytes, which is 32 hex characters. A short salt repeats sooner.'
          : notFormed
      ),
      result(
        'The hash is scrypt of the password with that salt',
        (run) => !run.parts.form || wrongHash(run),
        !formed
          ? notFormed
          : runs.some((run) => run.parts.bytes !== 64)
            ? 'The hash should be 64 bytes long, which is 128 hex characters. A shorter hash is easier to match by chance.'
            : runs.some((run) => !run.parts.scrypt && run.parts.saltAsBytes)
              ? 'The hash matches when the salt is given to scrypt as its bytes, but the task asks for the salt as its hex text, the way it is stored. verifyPassword can only read it back one way.'
              : 'The hash part is not what scrypt makes from this password with this salt. Look at which function made it, and what it was given.'
      )
    ]
  },

  async verify(t) {
    const kofi = stored('lemon-slip-42')
    const cases = [
      {
        name: 'The right password is accepted',
        password: 'lemon-slip-42',
        stored: kofi,
        want: true
      },
      { name: 'A wrong password is refused', password: 'lemon-slip-24', stored: kofi, want: false },
      {
        name: 'The same letters in capitals are refused',
        password: 'LEMON-SLIP-42',
        stored: kofi,
        want: false
      },
      { name: 'An empty password is refused', password: '', stored: kofi, want: false },
      {
        name: 'A password in plain text is not a hash',
        password: 'oxide-blue-77',
        stored: 'oxide-blue-77',
        want: false
      },
      {
        name: 'A stored value cut short answers false',
        password: 'oxide',
        stored: 'ab12:cd34',
        want: false
      },
      {
        name: 'A value with no salt answers false',
        password: 'oxide',
        stored: 'not-a-hash',
        want: false
      },
      {
        name: 'A stored value with something added after the hash answers false',
        password: 'lemon-slip-42',
        stored: `${kofi}:extra`,
        want: false,
        hint: 'The stored value has a third part after the hash, so it is not a salt and a hash. It was accepted because only its first two parts were looked at. Look at the whole value before trusting any of it.'
      },
      {
        name: 'A stored value whose hash ends in other characters answers false',
        password: 'lemon-slip-42',
        stored: `${kofi}zz`,
        want: false,
        hint: 'The hash in this stored value ends in characters that are not hex, so it is a broken record. It was accepted because turning hex into bytes stops quietly at the first character it cannot read. Look at the whole value before trusting any of it.'
      }
    ]
    const r = await t.call(await sandbox(t), '.grader/harness.mjs', 'verifies', [
      cases.map(({ password, stored }) => ({ password, stored }))
    ])
    if (!r.ok) return broken('verifyPassword can be called', r.error)
    const unwritten = r.value.find((x) => notImplemented(x.thrown))
    if (unwritten) return broken('verifyPassword is written', unwritten.thrown)
    const call = (c) => `verifyPassword(${JSON.stringify(c.password)}, ${JSON.stringify(c.stored)})`
    const details = cases.map((c, i) => {
      const got = r.value[i]
      const passed = got.thrown === undefined && got.value === c.want
      let message
      if (got.thrown) {
        message = c.want
          ? 'verifyPassword threw for the right password. Read the error below.'
          : 'verifyPassword threw for this stored value. It should answer false, so a broken record never signs anyone in or crashes the sign-in. Look at what happens to a value of the wrong form or length.'
      } else if (c.want) {
        message =
          'The right password was refused. The typed password has to be hashed exactly the way the stored one was, with its salt and its length, before the two can match.'
      } else {
        message =
          c.hint ??
          'This should be refused, and it was accepted. Look at what your function compares, and whether it can answer true without the two hashes matching.'
      }
      return {
        name: c.name,
        passed,
        message: passed ? undefined : message,
        output: `${call(c)}\n${got.thrown ? `threw ${got.thrown}` : `returned ${JSON.stringify(got.value)}`}`
      }
    })
    const right = r.value[0]
    const constant = right.value === true && right.calls.timingSafeEqual > 0
    details.push({
      name: 'The hashes are compared in constant time',
      passed: constant,
      message: constant
        ? undefined
        : right.value !== true
          ? 'Accept the right password first; then this is checked.'
          : 'The right answer came back, but the two hashes were compared in a way that stops at the first byte that differs. How long that takes tells an attacker how much of a guess was right. Look at the lesson part on comparing in constant time.',
      output: `${call(cases[0])}\nreturned ${JSON.stringify(right.value)}, with ${right.calls.timingSafeEqual} comparison(s) that take the same time whatever the bytes.`
    })
    return details
  },

  async 'add-staff'(t) {
    const dir = await sandbox(t, ['src/passwords.js'])
    const r = await t.call(dir, '.grader/harness.mjs', 'addsStaff', [people])
    if (!r.ok) return broken('addStaff can be called', r.error)
    const { returned, thrown, records } = r.value
    if (thrown) {
      return notImplemented(thrown)
        ? broken('addStaff is written', thrown)
        : [
            {
              name: 'addStaff saves each person',
              passed: false,
              message: 'addStaff threw an error. Read it, then run node try.js.',
              output: thrown
            }
          ]
    }
    const calls = people
      .map(
        (p, i) => `addStaff(staff, ${JSON.stringify(p)})\nreturned ${JSON.stringify(returned[i])}`
      )
      .join('\n\n')
    const held = `The staff store holds:\n${JSON.stringify(records, null, 2)}`
    const plainText = records.find((record, i) =>
      people.some((p) => JSON.stringify(record).includes(p.password))
    )
    const checksOut = people.every((p, i) => {
      const record = records[i]
      const match = HEX_PAIR.exec(String(record?.passwordHash ?? ''))
      return match && hashOf(p.password, record.passwordHash).scrypt
    })
    const kept = people.every(
      (p, i) =>
        records[i]?.name === p.name && records[i]?.email === p.email && records[i]?.role === p.role
    )
    const returns = people.every((p, i) => same(returned?.[i], publicOf(p, i + 1)))
    const result = (name, passed, message, output) => ({
      name,
      passed,
      message: passed ? undefined : message,
      output
    })
    return [
      result(
        'The store never holds the password',
        records.length === people.length && !plainText,
        records.length !== people.length
          ? `The staff store should hold one member per call, ${people.length} here. Save each person with the store's add().`
          : 'A password was saved in the staff store as it was typed. Whoever can read the store, a backup or a log of it, could sign in as that person. Keep only its hash.',
        held
      ),
      result(
        'Each member has a passwordHash that checks out',
        checksOut,
        "Each saved member should have a passwordHash field holding what hashPassword() makes from that person's password.",
        held
      ),
      result(
        'Name, email and role are kept',
        kept,
        'The name, email and role of each person should be saved as they were given.',
        held
      ),
      result(
        'Returns the member without the hash',
        returns,
        returned?.some?.((x) => x && ('passwordHash' in x || 'password' in x))
          ? 'What addStaff returns goes on to other code, and later into answers. It should leave out the password and its hash.'
          : 'addStaff should return the saved member as { id, name, email, role }, with the id the store gave it.',
        calls
      )
    ]
  }
}
