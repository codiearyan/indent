# Timers and stopping cleanly

## What you will be able to do

Every script so far did its job and ended. Some jobs go on: they repeat, they wait for something to happen, and they stop when someone says so. In this last issue of the part your script keeps running on a timer and stops cleanly when asked. By the end of it you will be able to:

- say why a script ends by itself, and find what keeps one running
- repeat a job with `setInterval`, and stop it with `clearInterval`
- read lines typed into the terminal while a script runs, and stop reading
- handle Ctrl+C with a listener for `SIGINT`, and say what differs on Windows

## The request from Rhiannon

> **Rhiannon:** In a dry spell only one hose may run at the main tap, so the plots take turns. I stand there with my watch and shout the next plot every ten minutes. Could the laptop in the shed call the turns? And when it rains and I stop it, it should tell me who goes first next time, so nobody loses their turn.

## Why a script ends

Node runs your script's lines, then looks for anything still waiting: a timer that has not fired, a file still being read, input it is listening to. While something is waiting, the script stays alive. When nothing is, it ends. That is why a script with an `await readFile` waits for the file, and why one that starts a timer and never stops it runs forever. When a script will not end, ask what it is still waiting for.

## Repeating with setInterval

`setTimeout(fn, ms)` calls `fn` once, after `ms` milliseconds. `setInterval(fn, ms)` calls it again and again, every `ms` milliseconds, until you stop it. Both give back the timer, and `clearInterval(timer)` stops a repeating one:

```js
let left = 3
const timer = setInterval(() => {
  console.log('Water the seed trays.')
  left--
  if (left === 0) clearInterval(timer)
}, 2000)
```

The first call comes after the first wait, not straight away; call `fn` yourself once if it should start at once. Times are in milliseconds, so seconds typed by a person are multiplied by 1000. A timer is not exact: it fires at the earliest after its time, when the script is not busy with something else.

## Reading what is typed

A script can read the lines a person types while it runs, with the same `readline` you used for files, and `process.stdin`, the script's standard input, in place of the file:

```js
import { createInterface } from 'node:readline'

const input = createInterface({ input: process.stdin })
input.on('line', (line) => console.log(`You typed ${line}`))
```

Each time the person presses Enter, `line` gets what they typed. While it listens, the script waits for the next line forever, so it never ends by itself. `input.close()` stops listening. A script that ends once its work is done has to stop every timer and close every input it opened, so it helps to put all of that in one function and call it from every place the work can end.

## Ctrl+C and SIGINT

Pressing Ctrl+C in a terminal sends the running program a **signal** called `SIGINT`, "interrupt". By default Node stops on the spot: the line it was on is the last, nothing is tidied up, and on macOS and Linux the exit code is 130. A listener changes that:

```js
process.on('SIGINT', () => {
  console.log('Stopping. The trays had two waterings.')
  clearInterval(timer)
})
```

Once a listener is there, Ctrl+C no longer ends the script. Your listener has to stop what keeps it running, or Ctrl+C does nothing but print your line.

On Windows, Ctrl+C in the terminal reaches Node as `SIGINT` too, so the same listener works there. What differs is stopping a script from another program. On macOS and Linux one program can send another `SIGINT` or `SIGTERM` and its listener runs. Windows has no signals: Node's `process.kill()` there ends the other program at once, and its listener never runs. A job that other programs should be able to stop politely on every system also stops another way, such as a line typed into its input.

## Your work in this issue

All three tasks are in `rota.js`, and `rota.txt` holds the plots in their order. Run `node rota.js 3` for three-second turns; Rhiannon will use 600. While it runs, type `stop` and press Enter, or press Ctrl+C. When it ends by itself, the prompt comes back: if it does not, something is still waiting.
