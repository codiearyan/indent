import { dataCases } from '../../grading.mjs'

const FILE = 'pager.py'

// Every value below was worked out with textwrap and difflib on Python 3.9 and 3.14, which agree.

const NAME_INSIDE = (inside, module) => (error) =>
  error.type === 'NameError' && new RegExp(`'${inside}'`).test(error.message)
    ? `Python does not know the name ${inside} by itself. It lives inside the ${module} module: after import ${module}, it is reached as ${module}.${inside}, and only an import with from brings in the name alone`
    : null

export const checks = {
  wrap(t) {
    const list = [
      ['A long message at 20', 'Team at the col, two walkers cold but well, coming down the east path', 20, ['Team at the col, two', 'walkers cold but', 'well, coming down', 'the east path']],
      ['Words with hyphens at 12', 'Stretcher needed at Lowther-Crag north-east gully', 12, ['Stretcher', 'needed at', 'Lowther-Crag', 'north-east', 'gully']],
      ['A word longer than the width', 'Helicopter-winch-requested-immediately for casualty', 10, ['Helicopter', '-winch-', 'requested-', 'immediatel', 'y for', 'casualty']],
      ['A short message', 'Meet at the base', 30, ['Meet at the base']]
    ]
    return dataCases(t, {
      file: FILE,
      task: 1,
      fn: 'pager_lines',
      modules: true,
      errors: NAME_INSIDE('wrap', 'textwrap'),
      watch: ['textwrap.TextWrapper.wrap'],
      forbid: (watched) =>
        watched.length
          ? null
          : "pager_lines does not use textwrap's wrap, so the lines are made by hand. The task asks for the module's own wrap: it knows the cases a loop of your own would have to learn one by one, such as a word longer than the width.",
      typed: 'pager_lines gives back the same lines whatever message Check gives it. Wrap the message it is given.',
      list: list.map(([name, message, width, want]) => ({
        name,
        args: [message, width],
        expected: want,
        hint: (v) =>
          v.type === 'str'
            ? 'pager_lines gives back one text with line ends in it. The task asks for a list of the lines: textwrap has a function for each.'
            : `pager_lines does not give back the lines textwrap's wrap makes of the message at width ${width}. Give it the message and the width it is given.`
      }))
    })
  },

  closest(t) {
    const hills = ['Glas Tholl', 'Meikle Pap', 'Stob Ruadh', 'Creag Bheag', 'Meikle Bin']
    const list = [
      ['One letter missing', 'Glas Thol', 'Glas Tholl'],
      ['Typed in small letters', 'meikle pap', 'Meikle Pap'],
      ['Two hills close, the closer one', 'Meikle Bn', 'Meikle Bin'],
      ['A letter left out in the middle', 'Creag Beag', 'Creag Bheag'],
      ['No hill close', 'Ben Ledi', null]
    ]
    return dataCases(t, {
      file: FILE,
      task: 2,
      fn: 'closest_hill',
      modules: true,
      errors: NAME_INSIDE('get_close_matches', 'difflib'),
      typed: 'closest_hill gives back the same hill whatever Check types. Look for the hill it is given.',
      list: list.map(([name, typed, want]) => ({
        name,
        args: [typed, hills],
        expected: want,
        noneHint: 'closest_hill gives back None for a hill that is close to one on the list.',
        hint: (v) => {
          if (v.type === 'list')
            return 'closest_hill gives back the whole list of matches. The task asks for the closest hill itself, or None when there is none.'
          if (want === null)
            return `closest_hill gives back ${v.repr} for a hill that is close to none on the list. The task asks for None then.`
          if (v.type === 'str' && hills.includes(v.value))
            return 'closest_hill gives back a hill from the list, but not the closest. The function you found puts the closest match first; keep its usual cutoff.'
          return 'closest_hill does not give back the closest hill on the list it is given.'
        }
      }))
    })
  },

  async summary(t) {
    const list = [
      ['A long message at 30', 'Team at the col, two walkers cold but well, coming down the east path', 30, 'Team at the col, two [...]'],
      ['A message that fits', 'Meet at the base', 30, 'Meet at the base'],
      ['A long message at 45', 'Stretcher needed at Lowther Crag north-east gully, bring the vacuum mattress', 45, 'Stretcher needed at Lowther Crag north- [...]'],
      ['Spaces closed up', 'Callout   Scarth   Fell', 20, 'Callout Scarth Fell']
    ]
    const HIDDEN = (error) =>
      /^shorten\(\) missing 1 required positional argument: 'width'/.test(error.message)
        ? "after your import line, the name shorten no longer stands for Ailsa's function: an import brought textwrap's shorten in under the same name, over hers, and textwrap's takes a width too. Import it under a name of its own, or import the module and reach it through the module's name"
        : NAME_INSIDE('shorten', 'textwrap')(error)
    const summaries = await dataCases(t, {
      file: FILE,
      task: 3,
      fn: 'summary',
      modules: true,
      errors: HIDDEN,
      watch: ['textwrap.shorten'],
      forbid: (watched) =>
        watched.length
          ? null
          : "summary does not use textwrap's shorten. The name shorten on its own is Ailsa's function in this file; textwrap's needs an import line, and a name that is not taken yet.",
      typed: 'summary gives back the same text whatever message Check gives it. Cut down the message it is given.',
      list: list.map(([name, message, width, want]) => ({
        name,
        args: [message, width],
        expected: want,
        hint: (v) =>
          v.type === 'str' && v.value.length > width
            ? `summary gives back a text longer than ${width}. Give textwrap's shorten the width summary is given.`
            : "summary does not give back the message as textwrap's shorten cuts it down."
      }))
    })
    const ailsa = await dataCases(t, {
      file: FILE,
      task: 3,
      fn: 'shorten',
      modules: true,
      errors: HIDDEN,
      list: [
        ['HOTEL NINE', 'HN'],
        ['ECHO ONE ZERO', 'EOZ']
      ].map(([sign, want]) => ({
        name: `Ailsa's shorten still works for ${sign}`,
        args: [sign],
        expected: want,
        hint: (v) =>
          `After the lines under # Task 3 have run, shorten gives back ${v.repr} for ${sign}: it is no longer Ailsa's function. An import that brings in a name the file already uses puts the new one over the old. Import textwrap's shorten under a name of its own.`
      }))
    })
    return [...summaries, ...ailsa]
  }
}
