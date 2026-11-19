// Run with: node src/demo.ts
import { Emitter } from './emitter.ts'

function show(label: string, run: () => unknown): void {
  try {
    console.log(label, JSON.stringify(run()))
  } catch (err) {
    console.log(label, `Error: ${(err as Error).message}`)
  }
}

show('on a, on b, emit save(1) -> calls:', () => {
  const calls: string[] = []
  const emitter = new Emitter()
  emitter.on('save', (n) => calls.push(`a ${n}`))
  emitter.on('save', (n) => calls.push(`b ${n}`))
  emitter.emit('save', 1)
  return calls
})

show('once a, emit save twice -> calls:', () => {
  const calls: string[] = []
  const emitter = new Emitter()
  emitter.once('save', (n) => calls.push(`a ${n}`))
  emitter.emit('save', 1)
  emitter.emit('save', 2)
  return calls
})

show('a throws and removes c, then b and c -> calls, errors:', () => {
  const calls: string[] = []
  const errors: string[] = []
  const emitter = new Emitter({ onError: (error) => errors.push((error as Error).message) })
  const c = (): void => {
    calls.push('c')
  }
  emitter.on('save', () => {
    calls.push('a')
    emitter.off('save', c)
    throw new Error('disk full')
  })
  emitter.on('save', () => calls.push('b'))
  emitter.on('save', c)
  emitter.emit('save')
  return { calls, errors }
})
