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

show('memoize, brewing time asked three times:', () => {
  let brews = 0
  const brewSeconds = memoize((tea) => {
    brews += 1
    return tea === 'sencha' ? 60 : 180
  })
  return { answers: [brewSeconds('sencha'), brewSeconds('sencha'), brewSeconds('assam')], brews }
})

show('once, welcome email sent twice:', () => {
  const sent = []
  const sendWelcome = once((name) => sent.push(`Welcome, ${name}!`))
  sendWelcome('Ines')
  sendWelcome('Theo')
  return sent
})
