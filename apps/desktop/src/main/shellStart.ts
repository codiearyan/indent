import { mkdirSync, writeFileSync } from 'fs'
import { basename, join } from 'path'
import { dataFile } from './paths'

/**
 * Runs one of the learner's own zsh startup files, with ZDOTDIR pointing at their folder. A file
 * that moves ZDOTDIR (a .zshenv pointing at ~/.config/zsh) moves it for the next steps too.
 */
const zshStep = (file: string): string =>
  `ZDOTDIR="$INDENT_USER_ZDOTDIR"\n[[ -f "$ZDOTDIR/${file}" ]] && source "$ZDOTDIR/${file}"\n` +
  'INDENT_USER_ZDOTDIR="$ZDOTDIR"\n'

const PREPEND = 'export PATH="$INDENT_NODE_DIR:$PATH"\n'

/**
 * How to start the learner's login shell so `nodeDir` is first on its PATH. A login shell
 * rebuilds the PATH from its startup files (macOS's path_helper, nvm), so it is put first again
 * after the learner's own files ran: zsh through a ZDOTDIR of wrappers, bash through an rc file.
 */
export function shellLaunch(
  shell: string,
  nodeDir: string | null,
  env: Record<string, string>
): { args: string[]; env: Record<string, string> } {
  if (!nodeDir) return { args: ['-l'], env }
  const dir = dataFile('shell')
  mkdirSync(dir, { recursive: true })
  const name = basename(shell)
  if (name === 'zsh') {
    const back = 'ZDOTDIR="$INDENT_ZDOTDIR"\n'
    writeFileSync(join(dir, '.zshenv'), zshStep('.zshenv') + back)
    writeFileSync(join(dir, '.zprofile'), zshStep('.zprofile') + back)
    // ZDOTDIR stays on the learner's folder after this, so zsh reads their own .zlogin.
    writeFileSync(join(dir, '.zshrc'), zshStep('.zshrc') + PREPEND)
    return {
      args: ['-l'],
      env: {
        ...env,
        ZDOTDIR: dir,
        INDENT_ZDOTDIR: dir,
        INDENT_USER_ZDOTDIR: env.ZDOTDIR || env.HOME || '',
        INDENT_NODE_DIR: nodeDir
      }
    }
  }
  if (name === 'bash') {
    const rc = join(dir, 'bashrc')
    writeFileSync(
      rc,
      '[ -f /etc/profile ] && . /etc/profile\n' +
        'for f in ~/.bash_profile ~/.bash_login ~/.profile; do [ -f "$f" ] && { . "$f"; break; }; done\n' +
        PREPEND
    )
    return { args: ['--rcfile', rc, '-i'], env: { ...env, INDENT_NODE_DIR: nodeDir } }
  }
  // shortcut: other shells (fish) keep the PATH order their startup gives; hook them in if needed.
  return { args: ['-l'], env }
}
