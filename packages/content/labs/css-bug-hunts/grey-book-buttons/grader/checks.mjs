import { cascade, detail, forced, gate, line, openSite, resolve, whyLoses } from '../../site-checks.mjs'

const ORANGE = 'rgb(232, 116, 59)'
const INK = 'rgb(31, 27, 22)'
const STONE = 'rgb(216, 208, 196)'
const ORANGE_DEEP = 'rgb(168, 72, 27)'
const WIDTHS = [360, 1024]
const hasId = (selector) => /#[\w-]/.test(selector)

/**
 * Whether the buttons are orange with dark writing because Kwame's rule wins, without force and
 * without an id. `what` names them in words; returns { ok, message, output }.
 */
function primary(s, els, what, one = false) {
  const verb = (plural) => (one ? plural.replace(/^do$/, 'does').replace(/^get$/, 'gets') : plural)
  for (const width of WIDTHS)
    for (const el of els) {
      const wants = [
        ['background-color', ORANGE, 'orange'],
        ['color', INK, 'dark writing']
      ]
      for (const [property, want, words] of wants) {
        const steps = cascade(s, el, property, width)
        const winner = steps.at(-1)
        const got = s.style(el, width)[property]
        const value = (d) => s.norm(property, resolve(s, el, d.value, width))
        const output = `${what}, ${property} at ${width}px: ${got ?? 'not set'}\n${steps
          .map((d) => `${d === winner ? 'Wins:  ' : 'Loses: '}${line(d)}`)
          .reverse()
          .join('\n')}`
        if (got !== want) {
          const right = steps.findLast((d) => value(d) === want)
          const why = whyLoses(right, winner)
          return {
            ok: false,
            message: right
              ? `${what} ${verb('do')} not get the ${words} from Kwame's button rule, because ${why}. Find what makes that rule so strong and whether it needs to be.`
              : `No rule gives ${what} the ${words} any more. Kwame's .button-primary rule is where it comes from; keep it.`,
            output
          }
        }
        if (winner?.important || forced(s, el, [property], width).length)
          return {
            ok: false,
            message: `${what} ${verb('get')} the ${words} by force: an !important wins over every normal rule. The rule that was beating Kwame's is still as strong as before, and the next rule for these buttons will need force too. Take the !important out and weaken the rule at fault.`,
            output
          }
        if (winner && hasId(winner.picked) && !winner.picked.includes('button-primary'))
          return {
            ok: false,
            message: `${what} ${verb('get')} the ${words} from ${winner.picked}, the old rule itself, not from Kwame's .button-primary rule. That rule is still stronger than Kwame's and paints every link it picks. Make it weaker instead of changing its colour.`,
            output
          }
        if (winner && hasId(winner.picked))
          return {
            ok: false,
            message: `${what} ${verb('get')} the ${words} from a selector with an id in it, ${winner.picked}. An id is how the old rule beat Kwame's in the first place, and every later rule for these buttons would need one too. Make the button rule win without an id.`,
            output
          }
      }
    }
  return { ok: true, output: `${what}: orange with dark writing, from ${cascade(s, els[0], 'background-color').at(-1)?.picked}` }
}

const asDetail = (name, r) => detail(name, r.ok, r.message, r.output)

/** Whether `el` keeps `property` at `want`; says which rule now wins when it does not. */
function keeps(s, el, property, want, what) {
  const got = s.style(el)[property]
  if (got === want) return null
  const winner = cascade(s, el, property).at(-1)
  return {
    message: `${what}: not the look from before. It came from a rule you changed or removed, so give it a rule of its own that still picks it.`,
    output: `${what}, ${property}: ${got ?? 'not set'}${winner ? `\nWins now: ${line(winner)}` : '\nNo rule sets it now'}`
  }
}

export const checks = {
  async 'book-buttons'(t) {
    const s = await openSite(t)
    const name = 'The Book buttons are orange'
    return gate(s, name) ?? [asDetail(name, primary(s, s.$$('.film-card .button-primary'), 'The Book buttons'))]
  },

  async 'join-button'(t) {
    const s = await openSite(t)
    const name = 'The Become a member button is orange with dark writing'
    return (
      gate(s, name) ?? [asDetail(name, primary(s, s.$$('#membership .button-primary'), 'The Become a member button', true))]
    )
  },

  async neighbours(t) {
    const s = await openSite(t)
    const name = 'Everything next to the buttons looks as it did'
    const stop = gate(s, name)
    if (stop) return stop
    const book = primary(s, s.$$('.film-card .button-primary'), 'The Book buttons')
    const join = primary(s, s.$$('#membership .button-primary'), 'The Become a member button', true)
    if (!book.ok || !join.ok)
      return [
        detail(
          name,
          false,
          `This task checks what sits next to the buttons once they are fixed, so it waits for ${
            !book.ok && !join.ok ? 'tasks 1 and 2' : !book.ok ? 'task 1, the Book buttons' : 'task 2, the Become a member button'
          }. Finish that first.`,
          [book, join].filter((r) => !r.ok).map((r) => r.output.split('\n')[0]).join('\n')
        )
      ]
    const trailers = s.$$('.trailer-link')
    const terms = s.$('#membership .small a')
    const plain = [s.$('.gift-box .button'), s.$('.signup .button')]
    const nav = s.$$('.nav-list > li > a')
    const trailer =
      trailers.map((a) => keeps(s, a, 'background-color', STONE, 'The Trailer links')).find(Boolean) ??
      trailers.map((a) => keeps(s, a, 'color', INK, 'The Trailer links')).find(Boolean) ??
      trailers.map((a) => keeps(s, a, 'padding-left', '16px', 'The Trailer links')).find(Boolean)
    const term =
      keeps(s, terms, 'color', ORANGE_DEEP, "The members' terms link") ??
      (/^(bold|700)$/.test(s.style(terms)['font-weight'] ?? '')
        ? null
        : keeps(s, terms, 'font-weight', 'bold', "The members' terms link"))
    const others =
      plain.map((b) => keeps(s, b, 'background-color', STONE, `The ${b.textContent.trim()} button`)).find(Boolean) ??
      nav.map((a) => keeps(s, a, 'color', INK, 'The links in the header')).find(Boolean)
    return [
      detail('The Trailer links stay grey buttons', !trailer, trailer?.message, trailer?.output ?? 'Grey, dark writing, as before'),
      detail("The members' terms link stays dark orange and bold", !term, term?.message, term?.output ?? 'Dark orange and bold, as before'),
      detail(
        'The other buttons and links keep their colours',
        !others,
        others?.message?.replace(/It came from .*$/, 'Only the orange buttons were meant to change.'),
        others?.output ?? 'Choose a gift and Sign up stay grey, the header links stay dark'
      )
    ]
  }
}
