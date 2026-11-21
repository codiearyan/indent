import { nativeImage, type NativeImage } from 'electron'
import logo from '@indent/design/logo.png?asset'

/** Black where the logo's orange cube is and clear elsewhere, from BGRA pixels. */
export function cubeMask(bgra: Buffer): Buffer {
  const mask = Buffer.alloc(bgra.length)
  for (let i = 0; i < bgra.length; i += 4) {
    const warmth = Math.min(255, Math.max(0, (bgra[i + 2] - bgra[i]) * 2))
    mask[i + 3] = Math.round((warmth * bgra[i + 3]) / 255)
  }
  return mask
}

/** The smallest square around the opaque pixels of a mask `width` pixels wide. */
export function maskSquare(
  mask: Buffer,
  width: number
): { x: number; y: number; width: number; height: number } {
  let [left, top, right, bottom] = [width, width, 0, 0]
  for (let i = 3; i < mask.length; i += 4) {
    if (mask[i] < 128) continue
    const x = ((i - 3) / 4) % width
    const y = Math.floor((i - 3) / 4 / width)
    ;[left, top, right, bottom] = [
      Math.min(left, x),
      Math.min(top, y),
      Math.max(right, x),
      Math.max(bottom, y)
    ]
  }
  const side = Math.max(right - left, bottom - top) + 1
  const clamp = (start: number): number => Math.max(0, Math.min(width - side, start))
  return {
    x: clamp(Math.round((left + right + 1 - side) / 2)),
    y: clamp(Math.round((top + bottom + 1 - side) / 2)),
    width: side,
    height: side
  }
}

/**
 * The tray icon from the app logo. macOS gets the cube as a template image so the menu bar can
 * colour it; other systems show the logo itself.
 */
export function trayIcon(): NativeImage {
  const image = nativeImage.createFromPath(logo)
  if (process.platform !== 'darwin') return image.resize({ width: 32, height: 32, quality: 'best' })
  const { width, height } = image.getSize()
  const mask = nativeImage.createFromBitmap(cubeMask(image.toBitmap()), { width, height })
  const cube = mask.crop(maskSquare(mask.toBitmap(), width))
  const small = cube.resize({ width: 32, height: 32, quality: 'best' })
  const template = nativeImage.createFromBuffer(small.toPNG(), { scaleFactor: 2 })
  template.setTemplateImage(true)
  return template
}
