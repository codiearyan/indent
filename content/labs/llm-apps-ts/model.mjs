// Lab model behavior for Fernhollow, a small plant shop, and its assistant Moss.
// Replies depend only on the request.
import { countTokens } from '../../kit/tokens.mjs'

export const CHAT_CONTEXT_TOKENS = 400

const PLANTS = ['monstera', 'pothos', 'fern', 'cactus', 'orchid', 'snake plant', 'peace lily']

const CARE = {
  monstera:
    'Water your monstera when the top few centimetres of soil feel dry, and keep it in bright light that does not fall straight on the leaves.',
  pothos:
    'A pothos is happy with a drink once the soil is dry halfway down, and it copes with low light, though it grows faster near a window.',
  fern: 'Keep your fern evenly moist and out of direct sun, and mist it or stand it on a tray of wet pebbles when the air is dry.',
  cactus:
    'Give your cactus as much sun as you can, and water it only when the soil is completely dry, which in winter may be once a month.',
  orchid:
    'Water your orchid by soaking the pot for ten minutes once a week, let it drain fully, and keep it in bright light away from hot glass.',
  'snake plant':
    'A snake plant needs very little: water it every two or three weeks, let the soil dry out in between, and it will forgive a dark corner.',
  'peace lily':
    'Your peace lily will droop when it is thirsty, so water it then, keep it out of direct sun, and wipe the dust from its leaves now and then.'
}

const UNKNOWN_PLANT = 'I do not know that plant yet. Tell me its name and I will look it up for you.'

const text = (message) => (typeof message?.content === 'string' ? message.content : '')

const lastUser = (messages) => text([...messages].reverse().find((m) => m.role === 'user'))

const systemText = (messages) =>
  messages
    .filter((m) => m.role === 'system')
    .map(text)
    .join('\n')

const hasPersona = (messages) => /\bMoss\b/.test(systemText(messages))

export function findPlant(sentence) {
  const lower = sentence.toLowerCase()
  return PLANTS.find((plant) => new RegExp(`\\b${plant}(e?s)?\\b`).test(lower)) ?? null
}

// Chapters 1 and 4: one care question, one answer.
export function careReply(messages) {
  const plant = findPlant(lastUser(messages))
  return (hasPersona(messages) ? 'Moss here. ' : '') + (plant ? CARE[plant] : UNKNOWN_PLANT)
}

// Chapter 2: sorting the inbox. The reply follows the system message and the examples.
export const LABELS = ['watering', 'light', 'pests', 'order', 'other']

export function labelFor(message) {
  const s = message.toLowerCase()
  if (/\b(bugs?|mites?|aphids?|gnats?|insects?|pests?|webbing)\b/.test(s)) return 'pests'
  if (/\b(order|orders|ordered|delivery|delivered|refund|parcel|shipping|arrived|tracking)\b/.test(s)) {
    return 'order'
  }
  if (/\b(light|sun|sunny|window|dark|shade|leggy)\b/.test(s)) return 'light'
  if (/\b(water|watering|watered|soggy|dry|droopy|drooping|rot|rotting)\b/.test(s)) return 'watering'
  return 'other'
}

export function urgencyFor(message) {
  return /\b(dying|dead|urgent|asap|today|help)\b|!/i.test(message) ? 'high' : 'normal'
}

export function triageFields(message) {
  return { label: labelFor(message), plant: findPlant(message) ?? 'unknown', urgency: urgencyFor(message) }
}

const exampleShape = (reply) => {
  const keys = reply
    .trim()
    .split(' | ')
    .map((part) => part.match(/^([a-z]+): \S.*$/)?.[1])
  return keys.every(Boolean) ? keys : null
}

const capital = (word) => word[0].toUpperCase() + word.slice(1)

export function sortReply(messages) {
  const fields = triageFields(lastUser(messages))
  const example = [...messages.slice(0, -1)].reverse().find((m) => m.role === 'assistant')
  const shape = example ? exampleShape(text(example)) : null
  if (shape) return shape.map((key) => `${key}: ${fields[key] ?? 'unknown'}`).join(' | ')
  const system = systemText(messages).toLowerCase()
  if (LABELS.every((label) => system.includes(label)) && /\bonly\b/.test(system)) return fields.label
  if (system.includes('label') && system.includes('urgency')) {
    return `Label: ${capital(fields.label)}, Plant: ${capital(fields.plant)}, Urgency: ${capital(fields.urgency)}.`
  }
  return `This sounds like a question about ${fields.label}. I would pass it to someone on the team who knows ${
    fields.plant === 'unknown' ? 'house plants' : `the ${fields.plant}`
  } well.`
}

// Chapter 3: order emails. The first reply has the mistakes a real model makes; a repair message
// that names a mistake gets it fixed.
const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 }

export function orderFacts(email) {
  const s = email.toLowerCase()
  const digits = s.match(/\b(\d+)\b/)?.[1]
  const word = s.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/)?.[1]
  const pot = s.match(/\b(small|medium|large|big|huge)\b/)?.[1] ?? 'medium'
  const oversized = pot === 'big' || pot === 'huge'
  return {
    order: {
      plant: findPlant(email) ?? 'unknown',
      quantity: digits ? Number(digits) : word ? NUMBER_WORDS[word] : 1,
      potSize: oversized ? 'large' : pot,
      giftWrap: /\bgift/.test(s)
    },
    quantityWord: !digits && word ? word : null,
    potWord: oversized ? pot : null,
    note: email.includes('P.S.')
  }
}

export function orderReply(messages) {
  const first = messages.findIndex((m) => m.role === 'user')
  const email = text(messages[first])
  const { order, quantityWord, potWord, note } = orderFacts(email)
  if (!/json/i.test(systemText(messages) + email)) {
    return `Sounds like ${order.quantity} ${order.plant} in a ${order.potSize} pot${order.giftWrap ? ', gift wrapped' : ''}.`
  }
  const repairs = messages
    .slice(first + 1)
    .filter((m) => m.role === 'user')
    .map(text)
    .join('\n')
  const named = (pattern) => pattern.test(repairs)
  const reply = {
    ...order,
    quantity: quantityWord && !named(/quantity/i) ? quantityWord : order.quantity,
    potSize: potWord && !named(/pot ?size/i) ? potWord : order.potSize
  }
  let json = JSON.stringify(reply, null, 2)
  if (note && !named(/json/i)) json = json.replace(/\n}$/, ',\n  // the customer left a note\n}')
  return 'Here is the order:\n```json\n' + json + '\n```'
}

// Chapter 5: a conversation with a context limit.
export function chatReply(messages) {
  const used = messages.reduce((sum, m) => sum + countTokens(text(m)), 0)
  if (used > CHAT_CONTEXT_TOKENS) {
    throw Object.assign(
      new Error(
        `This model's maximum context length is ${CHAT_CONTEXT_TOKENS} tokens, but your messages used ${used} tokens.`
      ),
      { status: 400, code: 'context_length_exceeded' }
    )
  }
  const question = lastUser(messages)
  const plant = findPlant(question)
  const seen = messages.filter((m) => m.role === 'user').length
  const topic = question.split(/\s+/).filter(Boolean).slice(0, 6).join(' ').replace(/[.,!?;:]+$/, '')
  return `${hasPersona(messages) ? 'Moss here. ' : ''}About "${topic}": ${
    plant ? CARE[plant] : 'tell me which plant it is and I will help.'
  } (I can see ${seen} of your messages.)`
}

export const models = {
  'llmapps-care-1': (request) => careReply(request.messages ?? []),
  'llmapps-sort-1': (request) => sortReply(request.messages ?? []),
  'llmapps-order-1': (request) => orderReply(request.messages ?? []),
  'llmapps-chat-1': (request) => chatReply(request.messages ?? [])
}
