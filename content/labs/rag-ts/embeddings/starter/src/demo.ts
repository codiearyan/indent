// Run with: node src/demo.ts
import { cosine, embed, rank } from './embed.ts'
import { handbook } from './handbook.ts'

async function show(label: string, run: () => unknown): Promise<void> {
  console.log(`\n${label}`)
  try {
    console.log(await run())
  } catch (err) {
    console.log(`Error: ${(err as Error).message}`)
  }
}

const phrases = ['dog life vest', 'a life vest for every dog', 'car park charges']
await show(`embed(${JSON.stringify(phrases)}), the non-zero numbers of each vector:`, async () =>
  (await embed(phrases)).map((v) => `${v.length} numbers, non-zero: ${v.filter((x) => x !== 0).map((x) => x.toFixed(3)).join(' ')}`)
)
await show('cosine([3, 4], [4, 3]):', () => cosine([3, 4], [4, 3]))
await show('cosine of the first phrase with the other two:', async () => {
  const [dog, vest, car] = await embed(phrases)
  return { 'a life vest for every dog': cosine(dog, vest), 'car park charges': cosine(dog, car) }
})
await show('Handbook articles ranked for "Are dogs welcome in kayaks or canoes?":', async () =>
  (await rank('Are dogs welcome in kayaks or canoes?', handbook.map((doc) => doc.text))).map(
    ({ text, score }) => `${score.toFixed(3)}  ${handbook.find((doc) => doc.text === text)!.title}`
  )
)
