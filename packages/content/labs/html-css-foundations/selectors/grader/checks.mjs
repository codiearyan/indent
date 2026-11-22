import { clean, detail, judge, judged, line, notLinked, openStyled } from '../../style-checks.mjs'

const CLAY = 'rgb(164, 73, 42)'
const SAND = 'rgb(239, 220, 195)'
const ID = 'mug-of-the-month'
const FIX = 'Put the link from the last issue back in its head.'
const NOTES = [
  { name: 'the line about muddy clothes', words: 'muddy' },
  { name: 'the opening hours', words: 'tuesday to saturday' }
]

const bold = (v) => v === 'bold' || v === 'bolder' || Number(v) >= 600
const sel = (d) => d.selectors.map((x) => x.toLowerCase())
const tag = (el) => (el ? clean(el.outerHTML).match(/^<[^>]*>/)[0] : 'not found')

export const checks = {
  async headings(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const h1 = s.page.$('h1')
    const h2s = s.page.$$('h2')
    const options = { what: 'colour', wants: "Dilys's clay" }
    const h2 = h2s.find((h) => s.style(h).color !== CLAY) ?? h2s[0]
    const grouped = s.decls.find(
      (d) => d.property === 'color' && sel(d).includes('h1') && sel(d).includes('h2')
    )
    const joined = s.decls.find(
      (d) => d.property === 'color' && /\bh1\s+h2\b|\bh2\s+h1\b/i.test(d.selector)
    )
    const both = s.style(h1).color === CLAY && h2s.every((h) => s.style(h).color === CLAY)
    let message = 'Write one rule whose selector lists both kinds of heading.'
    if (joined)
      message =
        'Without a comma, two selectors mean one inside the other: an h2 inside an h1. A comma between them lists them.'
    else if (both)
      message =
        'Both kinds of heading are clay, but from separate rules. One rule can list both selectors, separated by a comma.'
    return [
      judged('The main heading is clay', s, h1, 'color', (v) => v === CLAY, {
        ...options,
        target: 'the main heading'
      }),
      judged('Every h2 heading is clay', s, h2, 'color', (v) => v === CLAY, {
        ...options,
        target: `the ${clean(h2?.textContent ?? 'h2')} heading`
      }),
      detail(
        'One rule colours both kinds of heading',
        Boolean(grouped),
        message,
        s.decls
          .filter((d) => d.property === 'color' && /h1|h2/i.test(d.selector))
          .map(line)
          .join('\n') || 'No rule colours the headings'
      )
    ]
  },

  async note(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const found = NOTES.map((n) => ({
      ...n,
      p: s.page.$$('p').find((p) => clean(p.textContent).toLowerCase().includes(n.words))
    }))
    const lost = found.find((n) => !n.p)
    if (lost)
      return [
        detail(
          'Both notes have the class note',
          false,
          `The paragraph with ${lost.name} could not be found. If its words changed, keep them as they were.`,
          'not found'
        )
      ]
    const classProblem = ({ p, name }) => {
      if (p.classList.contains('note')) return null
      if (p.querySelector('.note'))
        return `The class for ${name} is on an element inside its paragraph. Put it on the paragraph itself.`
      if (p.className)
        return `The paragraph with ${name} has a class, but not note. A class name must match exactly, capitals too.`
      return `The paragraph with ${name} has no class yet. Give it the class note.`
    }
    const problems = found.map((n) => ({ ...n, problem: classProblem(n) })).filter((n) => n.problem)
    const notNotes = s.page
      .$$('p')
      .filter((p) => !p.classList.contains('note') && s.style(p)['background-color'] === SAND)
    const unpainted = found.find((n) => s.style(n.p)['background-color'] !== SAND) ?? found[0]
    const byClass = s.decls.find(
      (d) => /^background(-color)?$/.test(d.property) && d.selectors.some((x) => /\.note\b/.test(x))
    )
    const dotless = s.decls.find(
      (d) => /^background/.test(d.property) && d.selectors.some((x) => /^note\b/i.test(x))
    )
    return [
      detail(
        'Both notes have the class note',
        problems.length === 0,
        problems[0]?.problem,
        found.map((n) => `${n.name}: ${tag(n.p)}`).join('\n')
      ),
      judged(
        'Both notes have the sand background',
        s,
        unpainted.p,
        'background-color',
        (v) => v === SAND,
        {
          target: unpainted.name,
          what: 'background colour',
          wants: "Dilys's sand",
          hint: (away) =>
            away.some((d) => /^note\b/i.test(d.selector))
              ? 'A selector without a dot picks elements called note, and there are none. A class is picked with a dot in front of its name.'
              : null
        }
      ),
      detail(
        'Only the notes have it',
        notNotes.length === 0,
        'Other paragraphs have the sand background too. A rule for every paragraph reaches them all; the class picks only the notes.',
        notNotes.length
          ? notNotes.map((p) => clean(p.textContent).slice(0, 50)).join('\n')
          : 'Only the notes are sand'
      ),
      detail(
        'The rule picks the notes by their class',
        Boolean(byClass),
        dotless
          ? 'A selector without a dot picks elements called note, and there are none. A class is picked with a dot in front of its name.'
          : 'The sand background should come from a rule that picks the class: a dot, then the class name.',
        s.decls
          .filter((d) => /^background/.test(d.property) && d.selector !== 'body')
          .map(line)
          .join('\n') || 'No rule sets a background on the notes'
      )
    ]
  },

  async mug(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const figure = s.page.$('figure')
    const holder = s.page.document.getElementById(ID)
    let idMessage = 'Give the figure the id from the task.'
    if (holder && holder !== figure)
      idMessage = `The id is on the <${holder.tagName.toLowerCase()}>, not on the figure. Put it on the figure, which holds the picture and its caption.`
    else if (figure?.id)
      idMessage = 'The figure has an id, but not the one in the task. An id must match exactly.'
    const byId = s.decls.find(
      (d) => d.property === 'text-align' && d.selectors.some((x) => x.includes(`#${ID}`))
    )
    const classy = s.decls.find(
      (d) => d.property === 'text-align' && d.selectors.some((x) => x.includes(`.${ID}`))
    )
    const dotHint = 'A dot picks a class. An id is picked with a # in front of its name.'
    return [
      detail(
        'The mug of the month has the id',
        Boolean(figure) && figure.id === ID,
        figure
          ? idMessage
          : 'The mug of the month figure is not on the page any more. It should still be in The shop.',
        tag(figure)
      ),
      judged('The mug of the month is centred', s, figure, 'text-align', (v) => v === 'center', {
        target: 'the mug of the month',
        what: 'text alignment',
        wants: 'centred',
        wrong: (value) =>
          value === 'centre'
            ? 'CSS spells its words the American way, so centre is not a value it knows.'
            : null,
        hint: (away) => (away.some((d) => d.selector.includes(`.${ID}`)) ? dotHint : null)
      }),
      detail(
        'The rule picks it by its id',
        Boolean(byId),
        classy ? dotHint : 'Centre the figure with a rule that picks its id: a #, then the id.',
        s.decls
          .filter((d) => d.property === 'text-align')
          .map(line)
          .join('\n') || 'No rule sets a text alignment'
      )
    ]
  },

  async 'nav-links'(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const nav = s.page.$('nav')
    const links = nav ? [...nav.querySelectorAll('a')] : []
    const plain = links.find((a) => !bold(s.style(a)['font-weight'] ?? '')) ?? links[0]
    const words = nav?.querySelector('p') ?? nav
    const others = s.page
      .$$('a')
      .filter((a) => !nav?.contains(a) && bold(s.style(a)['font-weight'] ?? ''))
    const wordsBold = words && bold(s.style(words)['font-weight'] ?? '')
    const descendant = s.decls.find(
      (d) =>
        (d.property === 'font-weight' || !s.known(d.property)) &&
        d.selectors.some(
          (x) =>
            /\s/.test(x.trim()) && /(^|\s)a$/i.test(x.trim()) && links.some((a) => s.matches(a, x))
        )
    )
    let onlyMessage = 'Some text other than the Jump to links is bold.'
    if (others.length)
      onlyMessage =
        'Other links on the page are bold too. A rule for every link reaches all of them; pick only the links inside the nav.'
    else if (wordsBold)
      onlyMessage =
        'The words Jump to are bold too. The rule should pick the links inside the nav, not the whole nav or its paragraph.'
    return [
      judged('The Jump to links are bold', s, plain, 'font-weight', (v) => bold(v), {
        target: `the ${clean(plain?.textContent ?? '')} link in the nav`,
        what: 'weight',
        wants: 'bold'
      }),
      detail(
        'Only the Jump to links are bold',
        others.length === 0 && !wordsBold,
        onlyMessage,
        [
          `Other bold links: ${others.map((a) => clean(a.textContent)).join(', ') || 'none'}`,
          `The words Jump to: ${wordsBold ? 'bold' : 'not bold'}`
        ].join('\n')
      ),
      detail(
        'The rule picks links inside the nav',
        Boolean(descendant),
        'Make the links bold with a selector that picks links by where they sit: inside the nav. Two selectors with a space between them do that.',
        s.decls
          .filter((d) => d.property === 'font-weight')
          .map(line)
          .join('\n') || 'No rule sets a weight'
      )
    ]
  }
}
