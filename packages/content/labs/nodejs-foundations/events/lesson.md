# Events of your own

## What you will be able to do

Your scripts can now read the logger's log a line at a time. So far one script does everything with each line. In this issue one part of the code announces what happened, and other parts decide what to do about it. Node is built this way: streams, servers and `readline` itself all **emit events**. By the end of it you will be able to:

- write a class that emits events, with `EventEmitter` from `node:events`
- listen with `on`, emit with `emit`, and pass a value along with the event
- say what happens to an `error` event nobody listens to, and read what Node prints
- remove a listener, or add one that runs only once

## The request from Imran

> **Imran:** More than 20 litres a minute on a tap means a hose left running, or worse, a burst pipe. I want the box to sound the alarm in the shed the first time it sees one. Not every minute after that: once it rings, someone is on the way, and the rest just get counted. And after a power cut the logger sometimes writes half a line, which made the old script fall over.

## Listeners and emit

An **event** is a name for something that happened, like `'open'` or `'leak'`. An **emitter** is an object that announces events; a **listener** is a function it calls when one happens. `on` adds a listener and `emit` announces:

```js
import { EventEmitter } from 'node:events'

const gate = new EventEmitter()
gate.on('open', (fob) => console.log(`Opened by ${fob}`))
gate.emit('open', 'fob 17')
```

Whatever you pass to `emit` after the name is handed to every listener of that event. An event can have many listeners, called in the order they were added. They run straight away, during `emit`, before the next line after it: an event is a function call to whoever is listening, not a message posted for later. Emitting an event nobody listens to is fine; nothing happens.

## An emitter of your own

A class that should emit events extends `EventEmitter`, and gets `on`, `emit` and the rest from it:

```js
export class Gate extends EventEmitter {
  constructor(code) {
    super()
    this.code = code
  }

  swipe(fob) {
    this.emit(fob === this.code ? 'open' : 'refused', fob)
  }
}
```

`super()` runs `EventEmitter`'s own constructor, and a class that extends another must call it before it touches `this`. Forget it and making a gate fails with `ReferenceError: Must call super constructor in derived class before accessing 'this'`. Inside a method, `this.emit` announces on the gate itself, so whoever has the gate can listen. The gate does not know who is listening, or what they do; that is the point.

## The error event

One name is special. When an emitter emits `'error'` and nothing listens for it, Node throws the value, and the script stops. If `swipe` ran `this.emit('error', new Error('Card reader is broken'))` with nobody listening, you would see:

```
Error: Card reader is broken
    at Gate.swipe (file:///home/kim/garden/gate.js:9:24)
    ...
Emitted 'error' event on Gate instance at:
    at Gate.swipe (file:///home/kim/garden/gate.js:9:12)
```

The first lines are the error and where it was made; the part after `Emitted 'error' event` says where it was emitted. That rule is on purpose: an error nobody is ready for should stop the program, not be lost. So emit an `Error` object, made with `new Error('...')`, whose message says what went wrong. Emit a plain string instead and Node can only say `Error [ERR_UNHANDLED_ERROR]: Unhandled error. ('Card reader is broken')`, with no clue where it came from. Code that knows what to do about the error listens for it with `on('error', ...)`, and the script goes on.

## Removing a listener

`off` removes a listener. You hand it the very same function you gave `on`, so that function needs a name:

```js
function welcome(fob) {
  console.log(`First visitor today: ${fob}`)
  gate.off('open', welcome)
}
gate.on('open', welcome)
```

An arrow written again inside `off` is a new function that was never added, so it removes nothing, and no error says so. `once` adds a listener that removes itself after its first call, which is the same thing in one line. Removing a listener you no longer need matters more than it looks: an emitter keeps every listener, and everything the listener uses, for as long as the emitter lives.

## Your work in this issue

Tasks 1 to 3 build the `Meter` class in `meter.js`, which turns each line of the log into events. Task 4 is `watch.js`, which reads the log the way you learned in the last issue, feeds each line to a meter, and listens. Run it with `node try.js watch.js water/june.txt`. To see an error nobody listens to, take the `error` listener out of `watch.js` for a moment and run it again.
