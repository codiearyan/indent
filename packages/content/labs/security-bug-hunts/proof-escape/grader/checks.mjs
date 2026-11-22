import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const show = (value) => JSON.stringify(value, null, 2)
const clear = (details) => details.map((d) => (d.passed ? { ...d, message: undefined } : d))

const FILES = [
  'proofs/2041/front.txt',
  'proofs/2041/back.txt',
  'proofs/2042/menu.txt',
  'proofs/2044/front.txt',
  'proofs-staff/2041-costs.txt',
  'config/mail.json',
  'src/folders.js'
]
const DOTTED = { name: '2044/back..v2.txt', text: 'PROOF 2044, back, second try\n' }

const sandbox = (t, original) =>
  t.sandbox({
    ...Object.fromEntries(FILES.map((f) => [f, t.chapterPath(`starter/${f}`)])),
    '.grader/drive.mjs': t.chapterPath('grader/drive.mjs'),
    ...(original ? { 'src/proofs.js': t.chapterPath('starter/src/proofs.js') } : {})
  })
const starterText = (t, rel) => readFileSync(t.chapterPath(join('starter', rel)), 'utf8')

const OUTSIDE =
  'This name leads outside the proofs folder, and the file was read. What matters is where the name ends up once every .. is followed, not how it looks.'
const hostile = [
  {
    name: '../proofs-staff/2041-costs.txt',
    message:
      'This name leads into proofs-staff, a folder beside proofs whose path starts with the same letters, and the file was read.'
  },
  { name: '../config/mail.json', message: OUTSIDE },
  { name: '2041/../../config/mail.json', message: OUTSIDE },
  { name: '....//config/mail.json', message: OUTSIDE },
  { name: '..\\config\\mail.json', message: OUTSIDE },
  {
    name: 'config/mail.json',
    absolute: true,
    message: 'A full path that starts at the root of the disk was read. It leaves the proofs folder at once.'
  }
]

export const checks = {
  async reproduce(t) {
    const dir = await sandbox(t, true)
    const r = await t.call(dir, 'src/reproduce.js', 'reproduceProofEscape')
    if (!r.ok) {
      return [
        {
          name: 'reproduceProofEscape returns a result',
          passed: false,
          message: 'reproduceProofEscape threw instead of returning { fileName, shown }. Read the error.',
          output: r.error
        }
      ]
    }
    const { fileName, shown } = r.value ?? {}
    const usable = typeof fileName === 'string' && fileName.length > 0
    const [run, leaves] = usable
      ? await Promise.all([
          t.call(dir, '.grader/drive.mjs', 'read', [[{ name: fileName }]]),
          t.call(dir, '.grader/drive.mjs', 'leaves', [fileName])
        ])
      : []
    const real = run?.ok ? run.value[0] : undefined
    return clear([
      {
        name: 'Returns the file name it used',
        passed: usable,
        message: 'Return fileName, the name you passed to readProof(), as a string.',
        output: show(r.value)
      },
      {
        name: 'shown is what the original readProof() returned',
        passed: usable && real?.got !== undefined && shown === real.got,
        message: 'shown should be exactly what readProof(PROOFS_DIR, fileName) returned, unchanged.',
        output: `${show(r.value)}\n\nreadProof() returned:\n${real?.error ?? show(real?.got)}`
      },
      {
        name: 'shown is a file from outside the proofs folder',
        passed: usable && leaves?.value === true && typeof real?.got === 'string',
        message:
          leaves?.value === true
            ? 'This name leads outside the proofs folder, but there is no file there, so nothing was read. Point it at a file that exists.'
            : 'This name stays inside the proofs folder, so it does not show the hole. Use .. to climb out of it.',
        output: show(r.value)
      }
    ])
  },

  async fix(t) {
    const dir = await sandbox(t, false)
    const honest = [
      { label: 'A proof in its order folder is read', name: '2041/front.txt', text: starterText(t, 'proofs/2041/front.txt') },
      { label: "Another order's proof is read", name: '2042/menu.txt', text: starterText(t, 'proofs/2042/menu.txt') },
      { label: 'A name with two dots in a row is just a name', name: DOTTED.name, text: DOTTED.text },
      { label: 'A name inside the folder with no file gives null', name: '2041/missing.txt', text: null }
    ]
    const run = await t.call(dir, '.grader/drive.mjs', 'read', [
      [...honest, ...hostile].map(({ name, absolute }) => ({ name, absolute }))
    ])
    if (!run.ok) {
      return [
        {
          name: 'proofs.js loads',
          passed: false,
          message: 'proofs.js could not be loaded. Read the error.',
          output: run.error
        }
      ]
    }
    const call = (r) => `readProof(proofsDir, ${JSON.stringify(r.fileName)})`
    const got = (r) => r.error ?? show(r.got)
    const details = honest.map((c, i) => {
      const r = run.value[i]
      return {
        name: c.label,
        passed: !r.error && r.got === c.text,
        message: r.error
          ? 'readProof threw for an honest name. It should give the proof, or null when there is none.'
          : c.text === null
            ? 'There is no such proof, so readProof should give null.'
            : 'An honest proof name was refused. Names can hold folders and dots; only where the name leads decides.',
        output: `${call(r)}\ngot ${got(r)}`
      }
    })
    hostile.forEach((c, j) => {
      const r = run.value[honest.length + j]
      details.push({
        name: `${c.absolute ? 'A full path' : c.name} gives null`,
        passed: !r.error && r.got === null,
        message: r.error ? 'readProof threw for this name. A name that leads outside gives null.' : c.message,
        output: `${call(r)}\ngot ${got(r)}`
      })
    })
    return clear(details)
  },

  async test(t) {
    const [details, refused] = await Promise.all([
      t.judgeTest({
        test: 'src/proofs.test.js',
        target: 'src/proofs.js',
        wrong: 'grader/variants/starts-with-folder.js',
        wrongLabel: 'a fix that only checks the full path starts with the folder\'s path'
      }),
      t.sandbox({ 'src/proofs.js': t.chapterPath('grader/variants/refuse-every-name.js') }).then((dir) =>
        t.vitest(dir, 'src/proofs.test.js')
      )
    ])
    return [
      ...details,
      {
        name: 'Fails on a fix that gives null for every name',
        passed: !refused.passed,
        message: refused.passed
          ? 'Your test passed beside a fix that gives null for every name, real proofs included. Keep a case where a real proof still downloads.'
          : undefined,
        output: refused.output
      }
    ]
  }
}
