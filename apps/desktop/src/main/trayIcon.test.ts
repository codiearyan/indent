import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ nativeImage: {} }))
vi.mock('@indent/design/logo.png?asset', () => ({ default: '' }))

const { cubeMask, maskSquare } = await import('./trayIcon')

/** BGRA pixels from [r, g, b, a] tuples. */
const pixels = (...rgba: number[][]): Buffer =>
  Buffer.from(rgba.flatMap(([r, g, b, a]) => [b, g, r, a]))

describe('cubeMask', () => {
  it('keeps the orange, drops the dark frame and the clear corners', () => {
    const mask = cubeMask(pixels([235, 95, 45, 255], [35, 35, 38, 255], [235, 95, 45, 0]))
    expect([...mask]).toEqual([0, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0])
  })
})

describe('maskSquare', () => {
  it('is the square around the opaque pixels', () => {
    const o = [0, 0, 0, 255]
    const _ = [0, 0, 0, 0]
    // 4 by 3, opaque at (1,1) and (2,1).
    const mask = Buffer.from([
      ..._,
      ..._,
      ..._,
      ..._,
      ..._,
      ...o,
      ...o,
      ..._,
      ..._,
      ..._,
      ..._,
      ..._
    ])
    expect(maskSquare(mask, 4)).toEqual({ x: 1, y: 1, width: 2, height: 2 })
  })
})
