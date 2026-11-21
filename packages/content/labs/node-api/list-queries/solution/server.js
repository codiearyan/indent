// Run with: node server.js
// Then, from another terminal tab: curl -i http://localhost:3000/health
import { createApp } from './src/app.js'

const server = createApp()

server.listen(Number(process.env.PORT ?? 3000), () => {
  console.log(`Larchmere API listening on http://localhost:${server.address().port}`)
})
