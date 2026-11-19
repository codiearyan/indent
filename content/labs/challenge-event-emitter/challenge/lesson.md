# Event emitter

## The problem

An event emitter lets one part of a program announce that something happened, while any number of other parts react without knowing about each other. A save button emits `save`, and the autosave timer, the status bar and the undo history each listen.

You build an `Emitter` class in three steps: the basic `on`, `off` and `emit`, then listeners that run once, then an `emit` that stays correct when listeners change the list or throw halfway through.

## Constraints

- Listeners run in the order they were added, with the arguments given to `emit`.
- Each call to `on` or `once` is its own registration. The same function added twice runs twice, and `off` removes the earliest one.
- Removing a listener must be cheap. The last check removes 30,000 listeners during a single emit.
- Use TypeScript that Node can run directly: explicit `.ts` import extensions, no enums, no parameter properties.

## Worked examples

A basic emit, and a remove function:

```ts
const emitter = new Emitter()
const stop = emitter.on('save', (file) => console.log('saved', file))
emitter.on('save', (file) => console.log('backup', file))
emitter.emit('save', 'notes.txt')   // saved notes.txt, backup notes.txt, returns true
stop()
emitter.emit('save', 'todo.txt')    // backup todo.txt
emitter.emit('close')               // false: nobody listens
```

A listener that changes the list while an emit runs:

```ts
emitter.on('tick', () => emitter.off('tick', b))  // a
emitter.on('tick', b)
emitter.emit('tick')   // a runs, b was removed before its turn, so b does not run
```

## Task 1: on, off and emit

Store listeners per event name. The detail that matters is identity: if you keep plain functions, you cannot tell two registrations of the same function apart, and the remove function returned by `on` might remove the wrong one.

## Task 2: once

A `once` listener runs on the next emit, then disappears. It still has to be removable with `off` and the original function before it runs, so it cannot simply be hidden inside a wrapper. Think about the moment of removal: if the listener emits the same event, it must not run again.

## Task 3: safe emits

Two things go wrong in a naive emitter. Looping over the live array while a listener removes itself shifts the next listener into the current slot, so it gets skipped. Looping over a copy fixes that, but then a listener removed by an earlier one still runs. The rule here: an emit uses the listeners that existed when it started, minus any removed since.

Errors are the other half. One broken listener should not silence the rest. With an `onError` option, report each error and carry on. Without it, run everyone, then throw the first error so it is not lost.

## How it is checked

Run `node src/demo.ts` to watch a few events. The check replays hidden scenarios for each task and compares what ran, in which order, and what each method returned. Task 3 also times a large run where every listener removes itself. Your file is type-checked too.
