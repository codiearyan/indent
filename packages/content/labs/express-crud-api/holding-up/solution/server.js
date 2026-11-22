// Run with: node server.js
// Then, from another terminal tab: curl -i http://localhost:3000/health
import { createApp } from './src/app.js'

const app = createApp()

const server = app.listen(Number(process.env.PORT ?? 3000), () => {
  console.log(`Copperleaf API listening on http://localhost:${server.address().port}`)
})
