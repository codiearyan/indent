// Event emitter
//
// Task 1: on, off, emit
// - on(event, listener) registers a listener and returns a function that removes it again.
//   Registering the same listener twice means it runs twice.
// - off(event, listener) removes the earliest registration of that listener for that event.
//   It returns true when something was removed, false otherwise.
// - emit(event, ...args) calls every listener of that event in the order they were added, with
//   the same arguments. It returns true when the event had listeners, false otherwise.
// - listenerCount(event) is the number of registrations for that event.
//
// Task 2: once
// - once(event, listener) registers a listener that runs on the next emit only, then is removed.
//   It returns a remove function like on. off(event, listener) also removes it before it runs.
//
// Task 3: safe emits
// - A listener added during an emit does not run in that emit. It runs from the next one.
// - A listener removed during an emit, before its turn, does not run in that emit.
// - A listener that throws does not stop the others. With an onError option, onError(error, event)
//   is called for each error and emit returns normally. Without it, emit throws the first error
//   after every listener has run.
// - Removing listeners must stay cheap: the check removes 30,000 listeners during one emit.
export type Listener = (...args: any[]) => void

export interface EmitterOptions {
  onError?: (error: unknown, event: string) => void
}

export class Emitter {
  constructor(options: EmitterOptions = {}) {
    throw new Error('Not implemented')
  }

  on(event: string, listener: Listener): () => void {
    throw new Error('Not implemented')
  }

  once(event: string, listener: Listener): () => void {
    throw new Error('Not implemented')
  }

  off(event: string, listener: Listener): boolean {
    throw new Error('Not implemented')
  }

  emit(event: string, ...args: unknown[]): boolean {
    throw new Error('Not implemented')
  }

  listenerCount(event: string): number {
    throw new Error('Not implemented')
  }
}
