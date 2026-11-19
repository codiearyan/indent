export interface Point {
  x: number
  y: number
}

const f = (n: number): string => n.toFixed(1)

/**
 * One curve plus an open chevron at its end, always as `M Q M L L`. Keeping the same commands for
 * every link lets the CSS `d` property interpolate between steps, so a straight link can bend into
 * an arc or flip direction smoothly.
 */
export function arrowPath(start: Point, control: Point, end: Point): string {
  let tx = end.x - control.x
  let ty = end.y - control.y
  if (Math.hypot(tx, ty) < 0.01) {
    tx = end.x - start.x
    ty = end.y - start.y
  }
  const len = Math.hypot(tx, ty) || 1
  const ux = tx / len
  const uy = ty / len
  const size = 7
  const wing = 4.5
  const bx = end.x - ux * size
  const by = end.y - uy * size
  return (
    `M ${f(start.x)} ${f(start.y)} Q ${f(control.x)} ${f(control.y)} ${f(end.x)} ${f(end.y)} ` +
    `M ${f(bx - uy * wing)} ${f(by + ux * wing)} L ${f(end.x)} ${f(end.y)} ` +
    `L ${f(bx + uy * wing)} ${f(by - ux * wing)}`
  )
}

/** Sets a path's shape through CSS, which (unlike the `d` attribute) can transition. */
export function pathStyle(d: string): React.CSSProperties {
  return { d: `path('${d}')` }
}
