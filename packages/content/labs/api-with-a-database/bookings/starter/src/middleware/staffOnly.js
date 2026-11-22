// staffOnly(key) returns a middleware. GET and HEAD requests go on to the next handler. Any
// other request goes on only when its x-staff-key header equals key; otherwise it answers 401
// with { error: { code: 'unauthorized', message } }.
export function staffOnly(key) {
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') return next()
    if (req.get('x-staff-key') === key) return next()
    res.status(401).json({
      error: { code: 'unauthorized', message: 'Only studio staff can change workshops' }
    })
  }
}
