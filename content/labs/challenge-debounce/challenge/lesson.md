# Debounce and throttle

## The problem

A search box that queries the server on every keystroke sends ten requests for one word. A scroll handler can fire hundreds of times a second. Debounce and throttle both wrap a function so a burst of calls turns into a few calls, but they answer different questions.

Debounce waits until the calls stop, then runs once. Throttle runs at a steady rate while calls keep coming. You build a debounce, give it leading and trailing options with `cancel` and `flush`, then build a throttle that never drops the last call.

## Constraints

- Timers come from an injectable `{ setTimeout, clearTimeout }` object, defaulting to `realTimers` in `src/timers.ts`. The check passes fake timers and moves a pretend clock, so never call the global `setTimeout` yourself.
- `fn` always runs with the arguments of the call it represents, all of them.
- The throttle check sends 100,000 calls and counts the timers you start.
- Use TypeScript that Node can run directly, with explicit `.ts` import extensions.

## Worked examples

With `waitMs` of 100 and calls at 0, 30 and 60 ms:

```text
debounce                       runs at 160 with the call from 60
debounce { leading: true }     runs at 0 with the call from 0, and at 160 with the call from 60
throttle                       runs at 0 with the call from 0, and at 100 with the call from 60
```

With calls at 0 and 250 ms, there are two separate bursts:

```text
debounce                       runs at 100 (from 0) and at 350 (from 250)
throttle                       runs at 0 and at 250, each window closes with nothing remembered
```

## Task 1: debounce

The returned function needs memory between calls, which a closure gives you. Every call cancels the previous timer and starts a new one. Here is a smaller use of injected timers, a reminder that returns a function to call it off:

```ts
function remindLater(message: string, ms: number, timers: Timers): () => void {
  const handle = timers.setTimeout(() => console.log(message), ms)
  return () => timers.clearTimeout(handle)
}
```

## Task 2: leading, trailing, cancel and flush

Think in bursts. A leading call runs at the start of a burst. A trailing call runs at its end, but only for a call that has not run yet: one call with both options set runs once, not twice. `cancel` throws the pending call away. `flush` runs it now. Both end the burst, so the next call starts a new one.

## Task 3: throttle

Throttle opens a window when it runs. Calls during the window only remember their arguments. When the window closes, a remembered call runs and opens the next window, so a steady stream runs once per window and the final call always lands. Calls inside a window never touch the timer.

## How it is checked

Run `node src/demo.ts` to watch each function with real timers. The check replays hidden call patterns on fake timers and compares the pretend time and arguments of every run, including cancel and flush at awkward moments.
