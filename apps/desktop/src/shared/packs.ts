/** Where the site publishes the repo library (scripts/build-packs.mjs). */
export const PACKS_URL = 'https://tryindent.vercel.app/packs/v1'

/**
 * The highest `format` in a repo's lab.json this app can run. Raise it with a change to the kit,
 * the runtime or the files a repo may contain; older apps then list such repos as needing an update.
 */
export const PACK_FORMAT = 2
