// Sefton's order server as it runs today: one function, one more if for every address.
// Nobody dares change it any more. Your router takes its place in the last issue.
import { sendJson } from './send.js'

export function oldServer(shop) {
  return (req, res) => {
    if (req.url === '/prices') return sendJson(res, 200, shop.prices())
    if (req.url.startsWith('/orders')) {
      if (req.url === '/orders') return sendJson(res, 200, shop.list())
      if (req.url.startsWith('/orders/today')) return sendJson(res, 200, shop.today())
      const order = shop.find(req.url.split('/')[2])
      if (order) return sendJson(res, 200, order)
    }
    sendJson(res, 404, { error: 'Not found' })
  }
}
