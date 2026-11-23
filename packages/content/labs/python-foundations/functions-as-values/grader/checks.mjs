import { classCases, tuple, valueRunCause } from '../../grading.mjs'

const FILE = 'call_handlers.py'
const s = JSON.stringify
const py = (x) => (Array.isArray(x) ? `[${x.map(s).join(', ')}]` : s(x))
const same = (a, b) => s(a) === s(b)

const EXPLAIN = (error) => {
  const m = error.message
  let found
  if ((found = /^send\(\) (missing|takes \d+ positional arguments? but (\d+) were given)/.exec(m))) {
    return found[1] === 'missing'
      ? 'send is a function of Check\'s own, and it takes one call sign. Your code called it with nothing in its round brackets'
      : `send is a function of Check's own, and it takes one call sign at a time. Your code called it with ${found[2]} values`
  }
  if ((found = /^handler\(\) (missing|takes \d+ positional arguments? but (\d+) were given)/.exec(m))) {
    return found[1] === 'missing'
      ? 'each handler is a function of Check\'s own, and it takes the text of the call. Your code called it with nothing in its round brackets'
      : `each handler is a function of Check's own, and it takes only the text of the call. Your code called it with ${found[2]} values`
  }
  if (/^make_pager\(\) missing 1 required positional argument/.test(m)) {
    return 'make_pager was called with only a call sign, as the task says, and its def line asks for more. make_pager takes the call sign alone: the message goes to the function it gives back'
  }
  if (
    (found = /^(\w+)\(\) (missing \d+|takes \d+ positional arguments? but 1 was given)/.exec(m)) &&
    !['send_to_all', 'route', 'make_pager', 'pagers_for'].includes(found[1])
  ) {
    return `a pager was called with one message, and its def line, ${found[1]}, does not take exactly one value. The function make_pager gives back takes the message`
  }
  return valueRunCause(error)
}

const SEND = `calls = []
def send(call_sign):
    calls.append(call_sign)
    return "paged " + str(call_sign)`

function sendSteps(signs) {
  const paged = signs.map((x) => `paged ${x}`)
  return [
    { code: SEND, hidden: '# Check makes send, a function of its own that notes each call sign it is given' },
    { code: `call_signs = ${py(signs)}` },
    { code: 'sent = send_to_all(call_signs, send)' },
    {
      code: 'calls',
      want: signs,
      hint: (v) =>
        !Array.isArray(v) || v.length === 0
          ? 'send was never called. A function that is handed in runs only when your code calls it, with round brackets after its name and a call sign in them.'
          : v.length === 1 && Array.isArray(v[0])
            ? 'send was called once, with the whole list of call signs. The task asks to call it once for each call sign.'
            : v.length !== signs.length
              ? `send was called ${v.length} ${v.length === 1 ? 'time' : 'times'} for ${signs.length} call signs. The task asks for one call for each call sign.`
              : 'send was called once for each call sign, but not with each call sign in turn, in the order of the list.'
    },
    {
      code: 'sent',
      want: paged,
      hint: (v) =>
        v === null
          ? 'send_to_all gives back None: it ends without return. The task asks for a list of what each call gave back.'
          : same(v, signs)
            ? 'send_to_all gives back the call signs themselves, not what send gave back for each of them.'
            : typeof v === 'string'
              ? 'send_to_all gives back what one call gave back, not a list of what every call gave back.'
              : 'send_to_all does not give back a list of what send gave back for each call sign, in order.'
    },
    {
      code: 'call_signs',
      want: signs,
      hint: 'send_to_all changed the list of call signs it was given. The task asks only for a new list.'
    }
  ]
}

const HANDLERS = `calls = []
def make_handler(kind):
    def handler(text):
        calls.append((kind, text))
        return kind + " handled " + str(text)
    return handler
handlers = {"lost": make_handler("lost"), "injured": make_handler("injured"), "other": make_handler("other")}`

function routeSteps([kind, text], [unknown, otherText]) {
  const first = tuple(kind, text)
  const second = tuple('other', otherText)
  const calledHint = (want) => (v) => {
    const got = Array.isArray(v) ? v : []
    const fresh = got.slice(want.length - 1)
    if (fresh.length === 0) {
      return 'No handler was called. Looking a handler up in the dictionary gives the function itself, and it runs only when it is called with round brackets and the text in them.'
    }
    if (fresh.length > 1) return 'route called more than one handler for one call. Only the handler for the call\'s kind runs.'
    const [k, x] = fresh[0]['@tuple'] ?? []
    if (x && typeof x === 'object') {
      return 'The handler was given the whole call. The task asks to give it only the text, the second value of the tuple.'
    }
    if (k !== want[want.length - 1]['@tuple'][0]) {
      return want.length === 2
        ? `For a kind the dictionary does not have, route called the handler for "${k}". The task asks for the handler for "other".`
        : `route called the handler for "${k}", not the one for the call's kind.`
    }
    return 'The handler was not given the text of the call.'
  }
  return [
    { code: HANDLERS, hidden: '# Check makes handlers of its own for "lost", "injured" and "other", each noting what it is given' },
    { code: `answer = route((${s(kind)}, ${s(text)}), handlers)` },
    { code: 'calls', want: [first], hint: calledHint([first]) },
    {
      code: 'answer',
      want: `${kind} handled ${text}`,
      hint: (v) =>
        v === null
          ? 'route gives back None: it calls the handler, but does not give back what the handler gave back, with return.'
          : 'route does not give back what the handler gave back for the text.'
    },
    { code: `answer = route((${s(unknown)}, ${s(otherText)}), handlers)` },
    { code: 'calls', want: [first, second], hint: calledHint([first, second]) },
    {
      code: 'answer',
      want: `other handled ${otherText}`,
      hint: 'For a kind the dictionary does not have, route does not give back what the handler for "other" gave back.'
    }
  ]
}

const isFunction = (name, maker) => ({
  code: `callable(${name}) or type(${name}).__name__`,
  want: true,
  hidden: `# Check asks whether ${name} is a function`,
  hint: (v) =>
    v === 'NoneType'
      ? `${maker} gives back None: it ends without return. The task asks it to give back a function.`
      : v === 'str'
        ? `${maker} gives back text, not a function: it worked out a message itself. The task asks it to give back a function that takes the message.`
        : `${maker} gives back ${v === 'tuple' ? 'a tuple' : `a ${v}`}, not a function.`
})

function pagerSteps([one, two], [m1, m2, m3]) {
  return [
    { code: `first = make_pager(${s(one)})` },
    isFunction('first', 'make_pager'),
    {
      code: `first(${s(m1)})`,
      want: `${one}: ${m1}`,
      hint: (v) =>
        v === null
          ? 'The function make_pager gives back gives back None: it ends without return.'
          : typeof v === 'string' && v.includes(one) && v.includes(m1)
            ? 'The pager\'s text has the call sign and the message, but not in the shape the task gives: the call sign, a colon, a space, then the message.'
            : 'The pager does not give back its call sign, a colon, a space and the message.'
    },
    { code: `second = make_pager(${s(two)})` },
    {
      code: `second(${s(m2)})`,
      want: `${two}: ${m2}`,
      hint: 'A second pager, made for another call sign, does not give back its own call sign and the message.'
    },
    {
      code: `first(${s(m3)})`,
      want: `${one}: ${m3}`,
      hint: (v) =>
        typeof v === 'string' && v.startsWith(two)
          ? `The first pager now gives the second pager's call sign. It reads a call sign kept outside it, which the second make_pager changed. Each pager has to keep the call sign its own make_pager was given.`
          : 'The first pager, called again after a second was made, does not give back its own call sign and the message.'
    }
  ]
}

const DEFINE = `def make_pager(call_sign):
    def pager(message):
        return call_sign + ": " + message
    return pager
`

function pagersSteps(signs, messages) {
  const last = signs[signs.length - 1]
  return [
    { code: `call_signs = ${py(signs)}` },
    { code: 'pagers = pagers_for(call_signs)' },
    {
      code: 'sorted(pagers) if isinstance(pagers, dict) else type(pagers).__name__',
      want: [...signs].sort(),
      hidden: '# Check reads the keys of what pagers_for gave back',
      hint: (v) =>
        v === 'NoneType'
          ? 'pagers_for gives back None: it ends without return.'
          : typeof v === 'string'
            ? `pagers_for gives back ${v === 'list' ? 'a list' : `a ${v}`}, and the task asks for a dictionary with a pager under each call sign.`
            : 'The dictionary pagers_for gives back does not have each call sign of the list as a key.'
    },
    {
      code: 'all(callable(p) for p in pagers.values())',
      want: true,
      hidden: '# Check asks whether every value in the dictionary is a function',
      hint: 'Not every value in the dictionary is a pager, a function that takes a message. A pager called while the dictionary is made gives back text instead of a function.'
    },
    ...signs.map((sign, i) => ({
      code: `pagers[${s(sign)}](${s(messages[i])})`,
      want: `${sign}: ${messages[i]}`,
      hint: (v) =>
        typeof v === 'string' && v.startsWith(`${last}:`) && sign !== last
          ? `The pager under ${sign} gives the last call sign of the list, ${last}. A function made inside a loop that reads the loop's name looks the name up when it is called, after the loop has ended, so every one of them finds its last value. Each pager has to keep its own call sign from where it was made: the lesson shows the way.`
          : `The pager under ${sign} does not give back ${sign}, a colon, a space and the message.`
    })),
    { code: 'call_signs', want: signs, hint: 'pagers_for changed the list of call signs it was given.' }
  ]
}

const options = (task, fn, list, extra = {}) => ({
  file: FILE,
  task,
  explain: EXPLAIN,
  names: { [fn]: 'function' },
  list,
  ...extra
})

export const checks = {
  send(t) {
    return classCases(t, options(1, 'send_to_all', [
      { name: 'A message for each of three teams', steps: sendSteps(['Delta', 'Echo', 'Foxtrot']) },
      { name: 'A message for each of two other teams', steps: sendSteps(['Kestrel', 'Golf']) }
    ]))
  },

  route(t) {
    return classCases(t, options(2, 'route', [
      { name: 'A call for a lost party, then a kind with no handler', steps: routeSteps(['lost', 'two walkers on Meikle Pap'], ['flood', 'the ford at Lochan Wood']) },
      { name: 'A call for an injury, then another kind with no handler', steps: routeSteps(['injured', 'a broken wrist at Black Corrie'], ['lights', 'a torch seen on Stob Ruadh']) }
    ]))
  },

  pager(t) {
    return classCases(t, options(3, 'make_pager', [
      { name: 'Two pagers, each with its own call sign', steps: pagerSteps(['Delta', 'Echo'], ['at the ford', 'back at base', 'moving up']) },
      { name: 'Two more pagers', steps: pagerSteps(['Kestrel', 'Golf'], ['stretcher needed', 'on the ridge', 'two hours out']) }
    ]))
  },

  pagers(t) {
    return classCases(t, options(4, 'pagers_for', [
      { name: 'A pager for each of three teams', steps: pagersSteps(['Delta', 'Echo', 'Foxtrot'], ['at the ford', 'back at base', 'moving up']) },
      { name: 'A pager for each of two teams', steps: pagersSteps(['Golf', 'Kestrel'], ['on the ridge', 'stretcher needed']) }
    ], { define: DEFINE }))
  }
}
