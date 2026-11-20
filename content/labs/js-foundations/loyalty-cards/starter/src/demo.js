// Run with: node src/demo.js
import { createStampCard } from './stampCard.js'
import { memoize } from './memoize.js'
import { once } from './once.js'

function show(label, run) {
  try {
    console.log(label, JSON.stringify(run()))
  } catch (err) {
    console.log(label, `Error: ${err.message}`)
  }
}

show('stamp card, goal 3, five stamps:', () => {
  const card = createStampCard(3)
  return [1, 2, 3, 4, 5].map(() => card.stamp())
})

show('memoize, burn time asked three times:', () => {
  let lookups = 0
  const burnHours = memoize((candle) => {
    lookups += 1
    return candle === 'cedar' ? 40 : 60
  })
  return { answers: [burnHours('cedar'), burnHours('cedar'), burnHours('birch')], lookups }
})

show('once, welcome email sent twice:', () => {
  const sent = []
  const sendWelcome = once((name) => sent.push(`Welcome, ${name}!`))
  sendWelcome('Ines')
  sendWelcome('Theo')
  return sent
})
