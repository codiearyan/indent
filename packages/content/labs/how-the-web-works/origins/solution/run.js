// Starts the cupboard server, runs your functions from src/origins.js against it and prints what
// was said. Run it with: node run.js
import { startStation } from './server/station.js'
import {
  sameOrigin,
  readAsPage,
  allowOrigin,
  needsPreflight,
  answerPreflight
} from './src/origins.js'

const station = await startStation()
console.log(`The cupboard server is listening at ${station.base}`)

const hall = 'https://heronsgate-hall.example/whats-on.html'
const quiz = 'https://quiz-night.example/round-3'

for (const [a, b] of [
  ['https://heronsgate-radio.example/shows', 'https://heronsgate-radio.example/requests'],
  ['https://heronsgate-radio.example/', 'http://heronsgate-radio.example/'],
  ['https://heronsgate-radio.example/', 'https://shop.heronsgate-radio.example/']
]) {
  await station.run(`Task 1: sameOrigin(${a}, ${b})`, () => sameOrigin(a, b))
}

await station.run("Task 2: the hall's page reads /api/now-playing", () =>
  readAsPage(hall, `${station.base}/api/now-playing`, false)
)
await station.run('Task 2: the quiz page reads /api/now-playing', () =>
  readAsPage(quiz, `${station.base}/api/now-playing`, false)
)
await station.run("Task 2: the hall's page reads /api/now-playing with cookies", () =>
  readAsPage(hall, `${station.base}/api/now-playing`, true)
)

const trusted = ['https://heronsgate-hall.example', 'https://heronsgate-radio.example']
for (const origin of ['https://heronsgate-hall.example', 'https://quiz-night.example', null]) {
  await station.run(`Task 3: allowOrigin for ${origin}`, () => allowOrigin(origin, trusted))
}

for (const [method, headers] of [
  ['GET', {}],
  ['POST', { 'Content-Type': 'application/json' }],
  ['DELETE', { Authorization: 'Bearer heron-studio-7' }]
]) {
  await station.run(`Task 4: needsPreflight for ${method} with ${JSON.stringify(headers)}`, () =>
    needsPreflight(method, headers)
  )
}

await station.run(
  "What the cupboard server answers when the station's site asks first",
  async () => {
    const response = await fetch(`${station.base}/api/requests`, {
      method: 'OPTIONS',
      headers: {
        origin: 'https://heronsgate-radio.example',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type'
      }
    })
    return response.status
  }
)

const rules = { origins: trusted, methods: ['GET', 'POST'], headers: ['content-type'] }
for (const origin of ['https://heronsgate-radio.example', 'https://quiz-night.example']) {
  const request = {
    method: 'OPTIONS',
    path: '/api/requests',
    headers: {
      origin,
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type'
    }
  }
  await station.run(`Task 5: answerPreflight for a POST from ${origin}`, () =>
    answerPreflight(request, rules)
  )
}

await station.stop()
