import { nativeImage, type NativeImage } from 'electron'
import logo from '@indent/design/logo.png?asset'
import glyph from '../../resources/trayTemplate.png?asset'

/** macOS gets a template glyph the menu bar can colour; other systems show the logo itself. */
export function trayIcon(): NativeImage {
  if (process.platform !== 'darwin') {
    return nativeImage.createFromPath(logo).resize({ width: 32, height: 32, quality: 'best' })
  }
  // Electron loads trayTemplate@2x.png beside it for sharp screens.
  const image = nativeImage.createFromPath(glyph)
  image.setTemplateImage(true)
  return image
}
