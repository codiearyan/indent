# Groups, setup and one test at a time

## What you will be able to do

Your runner now does the job: it runs plain and async tests one at a time, with time limits, a report and an exit code. This last issue adds what makes a long test file pleasant to live with. By the end of it you can:

- group tests under names, groups inside groups
- run setup code before every test of a group
- run just the test you are working on
- explain what each part of a test runner does, because you wrote it

## The request from Hesper

Hesper has been reading the reports every morning.

> **Hesper:** The list is getting long, and I can't tell which tests are about prices and which about paper. Sefton also says his job book tests break each other: one adds a job, and the next one finds it already there. And when he fixes one test he has to wait for all of them, supplier and all. Can it be tidier?

Three requests, three classic parts of a runner: groups, setup, and a way to focus.

## Groups are names on a stack

`describe('quote', fn)` does not save anything to run later. It calls `fn` straight away, and the tests inside are added while it runs. The trick is that the runner knows, at that moment, which groups are open, and puts their names in front of every test it saves.

Groups can sit inside groups, so the open groups form a stack: the newest one is on top, and it is the first to close.

```js
const folders = []

function inFolder(name, fn) {
  folders.push(name)
  try {
    fn()
  } finally {
    folders.pop()
  }
}

function save(file) {
  console.log([...folders, file].join('/'))
}

inFolder('invoices', () => {
  inFolder('2026', () => save('march.pdf')) // invoices/2026/march.pdf
  save('index.txt') // invoices/index.txt
})
save('notes.txt') // notes.txt
```

`finally` closes the group even when `fn` throws. Without it, one broken group would leave every later test inside it.

## Setup before each test

Sefton's job book tests share one `book` variable. When the same book is used by every test, each test sees what the last one left behind, and the results depend on the order they run in. The fix is to make a fresh book before every test. `beforeEach(fn)` registers a function the runner calls before each test of the group it is written in.

Which hooks apply to a test? Every hook of every group the test is in, plus any hook outside all groups, starting from the outermost. The simplest way to get that right: give each group its own list of hooks, and save with each test the lists, not copies of what is in them. A hook written below a test in the same group lands in the same list, so it still applies when the test runs.

Run the hooks inside the same `try` as the test. A hook that throws then fails the test with its own error, and the test's function never runs on half-built data. Hooks can be async too, and are waited for like tests.

## Focusing on one test

While fixing one thing, you want to run one test, not all of them. `test.only` adds a test exactly like `test()`, but marks it chosen. When `run()` starts, it looks at the saved tests: if any is chosen, it runs only the chosen ones. The rest are skipped entirely, never called.

Functions in JavaScript are objects, so `test.only` is simply a property on the `test` function. To keep the two from drifting apart, let both call one small helper that saves a test.

## Your work in this issue

All three tasks are at the bottom of `src/runner.js`, and each needs small changes to `test()` and `run()` as well. `tests/quote.test.js` now uses groups and a fresh job book for each test. Run:

```sh
node tests/quote.test.js
```

When you are done, the names show their groups and the job book tests pass. Then try it the way Sefton will: put `.only` on the bulk price test, and fix the bug in `src/quote.js` that your runner has reported since the first issue. The check never runs Sefton's tests. It builds small test files of its own.
