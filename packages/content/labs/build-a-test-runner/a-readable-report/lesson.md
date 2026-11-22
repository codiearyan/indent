# A report people can read

## What you will be able to do

Your runner finds failures and says why. But it prints a list of objects, and it always ends the same way, whether every test passed or not. By the end of this issue you can:

- turn results into a short report a person reads in seconds
- show any thrown value, even one that runs over several lines
- end a program with an exit code another program can rely on

## The request from Idris

Idris does the books at Ashgrove Press, and every evening he runs two things on the workshop computer: Sefton's tests, then the price list that goes in the shop window the next morning.

> **Idris:** Last Tuesday the tests failed, and I didn't notice. The output is a wall of curly brackets. The price list ran anyway, and the window showed the wrong bulk price for a day. I want the price list to print only when every test passed. And when one fails, I want to see which one and why, without reading code.

Two things are missing. The output is written for the program, not for Idris. And nothing tells the next step whether to go ahead.

## Facts in, words out

`run()` gives facts: a name, passed or not, an error. A report is a separate job: turning those facts into lines. Keeping it in its own function, in its own file, means you can change how the report looks without touching how tests run, and you can test the report with results you make up by hand:

```js
const lines = []
for (const parcel of parcels) {
  lines.push(`${parcel.sent ? 'SENT' : 'HELD'} ${parcel.id}`)
}
lines.push(`${parcels.length} parcels`)
console.log(lines.join('\n'))
```

Build an array of lines and join them once at the end. It is easier to read than adding to one long string, and each line stays a line you can reason about.

## Showing what went wrong

A good report puts the reason under the failed test, indented, so the eye finds it at once. An `Error` carries its reason in `message`. But a test can throw anything, and a string or an object has no message. For those, `inspect` from `node:util` writes the value the way the console would.

Messages can also run over several lines. `toEqual` writes objects with `inspect`, and a larger object comes out on several lines. If you indent only the first line, the rest of the message falls back to the left edge and looks like part of the next test. Split the reason on `'\n'`, indent every line, and join it again.

End with a summary: how many passed, how many failed, how many there were in all. That one line is often all anyone reads.

## Exit codes

Every program that ends hands a number back to whatever started it. `0` means it worked. Anything else means it did not. Shells use that number: `a && b` runs `b` only when `a` ended with `0`. That is how Idris's two steps become one safe line:

```sh
node tests/quote.test.js && node src/price-list.js
```

You can see the number yourself. Run a command, then `echo $?` in macOS and Linux shells, or `echo $LASTEXITCODE` in PowerShell.

Node ends with `0` unless something says otherwise, even when your tests failed. Setting `process.exitCode = 1` changes that: the program carries on, prints what it needs, and ends with `1` when it is done. `process.exit(1)` also sets the code, but stops the program at once. Node's own documentation warns that this can cut off output that is still being written, so set `process.exitCode` and let the program end by itself.

The code means "did anything fail", so it is `1` for one failure and `1` for ten. And a test file that added no tests at all is almost always a mistake, such as a file that forgot to import its tests. Treat it as a failure, with a sentence that says so.

## Your work in this issue

`formatReport` in `src/report.js` comes first: the lines per test, then the summary. Then `main()` at the bottom of `src/runner.js` runs the tests, prints the report and sets the exit code. `tests/quote.test.js` now ends with `main()`. Run Idris's line:

```sh
node tests/quote.test.js && node src/price-list.js
```

While the bulk price test fails, you see the report and no price list. The check never runs Sefton's tests. It formats results of its own, and runs small test files of its own as real programs.
