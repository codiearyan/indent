// Child process for t.call(): imports a module, calls one export and sends the result back over IPC.
import { pathToFileURL } from 'node:url'

const [file, exportName, argsJson] = process.argv.slice(2)

function reply(message) {
  process.send(message, () => process.exit(0))
}

try {
  const mod = await import(pathToFileURL(file).href)
  if (typeof mod[exportName] !== 'function') {
    reply({ ok: false, error: `${exportName} is not an exported function` })
  } else {
    const value = await mod[exportName](...JSON.parse(argsJson))
    reply({ ok: true, value: value === undefined ? null : JSON.parse(JSON.stringify(value)) })
  }
} catch (err) {
  reply({ ok: false, error: err instanceof Error ? `${err.name}: ${err.message}` : String(err) })
}
