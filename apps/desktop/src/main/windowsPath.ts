/** The value of `Path` in the output of `reg query <key> /v Path`, or '' when there is none. */
export function regPath(stdout: string): string {
  return /^\s*Path\s+REG_(?:EXPAND_)?SZ\s+(.*)$/im.exec(stdout)?.[1]?.trim() ?? ''
}

/** Joins the system and user Path from the registry, expanding %VARS% from `env`. */
export function freshWindowsPath(
  system: string,
  user: string,
  env: Record<string, string | undefined>
): string {
  return [system, user]
    .filter(Boolean)
    .join(';')
    .replace(/%([^%]+)%/g, (match, name: string) => env[name] ?? match)
}
