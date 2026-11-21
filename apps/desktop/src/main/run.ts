import { execFile, type ExecFileOptions } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/** Runs a program. On Windows a console program started by the app opens a window unless hidden. */
export function run(
  cmd: string,
  args: string[],
  options: Omit<ExecFileOptions, 'encoding'> = {}
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(cmd, args, { windowsHide: true, ...options, encoding: 'utf8' })
}
