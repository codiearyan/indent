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

interface Registration {
  listener: Listener
  once: boolean
}

export class Emitter {
  // A Set keeps insertion order and deletes in O(1), so an emit can check whether a
  // registration is still there before calling it.
  private events = new Map<string, Set<Registration>>()
  private onError?: (error: unknown, event: string) => void

  constructor(options: EmitterOptions = {}) {
    this.onError = options.onError
  }

  on(event: string, listener: Listener): () => void {
    return this.add(event, { listener, once: false })
  }

  once(event: string, listener: Listener): () => void {
    return this.add(event, { listener, once: true })
  }

  off(event: string, listener: Listener): boolean {
    const registrations = this.events.get(event)
    if (!registrations) return false
    for (const registration of registrations) {
      if (registration.listener === listener) return registrations.delete(registration)
    }
    return false
  }

  emit(event: string, ...args: unknown[]): boolean {
    const registrations = this.events.get(event)
    if (!registrations || registrations.size === 0) return false
    const errors: unknown[] = []
    for (const registration of [...registrations]) {
      if (!registrations.has(registration)) continue
      if (registration.once) registrations.delete(registration)
      try {
        registration.listener(...args)
      } catch (error) {
        if (this.onError) this.onError(error, event)
        else errors.push(error)
      }
    }
    if (errors.length > 0) throw errors[0]
    return true
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.size ?? 0
  }

  private add(event: string, registration: Registration): () => void {
    let registrations = this.events.get(event)
    if (!registrations) {
      registrations = new Set()
      this.events.set(event, registrations)
    }
    registrations.add(registration)
    const owner = registrations
    return () => {
      owner.delete(registration)
    }
  }
}
