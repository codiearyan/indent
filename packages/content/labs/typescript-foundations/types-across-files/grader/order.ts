// Check's own order.ts. Node never opens a file whose imports are all `import type`.
throw new Error('Node opened order.ts when it ran this file, so an import of it was not erased')

export type Order = {
  id: string
  blend: string
  tins: number
  grams: number
  express: boolean
}
