import { describe, expect, it } from 'vitest'
import { findLocation } from './checkLocation'

const paths = [
  'src/parse.ts',
  'src/orders.js',
  'orders.js',
  'src/my file.mjs',
  'notes.md',
  'README.md'
]
const dir = '/Users/sam/work/shop/1'

describe('findLocation', () => {
  it('finds the line of a syntax error in a check copy', () => {
    const output = [
      '/var/tmp/indent/check-Ab12Cd/src/orders.js:12',
      '  return total +',
      '               ^',
      '',
      'SyntaxError: Unexpected end of input'
    ].join('\n')
    expect(findLocation(output, paths, dir)).toEqual({ path: 'src/orders.js', line: 12 })
  })

  it('finds the first workspace frame of a stack trace with its column', () => {
    const output = [
      "TypeError: Cannot read properties of undefined (reading 'price')",
      '    at file:///opt/indent/kit/call-child.mjs:40:3',
      '    at orderTotal (file:///var/tmp/check-x9/src/orders.js:7:22)',
      '    at main (file:///var/tmp/check-x9/orders.js:3:1)'
    ].join('\n')
    expect(findLocation(output, paths, dir)).toEqual({ path: 'src/orders.js', line: 7, column: 22 })
  })

  it('takes the column from the stack when the crash line has none', () => {
    const output = [
      'file:///var/sb%20dir/check-BK5elJ/src/orders.js:25',
      'function f() { return null.x }',
      '                           ^',
      '',
      "TypeError: Cannot read properties of null (reading 'x')",
      '    at f (file:///var/sb%20dir/check-BK5elJ/src/orders.js:25:28)',
      '    at file:///var/sb%20dir/check-BK5elJ/src/orders.js:26:1'
    ].join('\n')
    expect(findLocation(output, paths, dir)).toEqual({
      path: 'src/orders.js',
      line: 25,
      column: 28
    })
  })

  it('reads a path with spaces, plain and from a file URL', () => {
    const plain = '    at load (/Users/sam lee/tmp/check-q1/src/my file.mjs:4:9)'
    const url = '    at load (file:///Users/sam%20lee/tmp/check-q1/src/my%20file.mjs:4:9)'
    const expected = { path: 'src/my file.mjs', line: 4, column: 9 }
    expect(findLocation(plain, paths, dir)).toEqual(expected)
    expect(findLocation(url, paths, dir)).toEqual(expected)
  })

  it('reads a Windows path', () => {
    const output =
      '    at orderTotal (C:\\Users\\Sam\\AppData\\Temp\\check-k3\\src\\orders.js:7:22)'
    expect(findLocation(output, paths, dir)).toEqual({ path: 'src/orders.js', line: 7, column: 22 })
    const url = '    at orderTotal (file:///C:/Users/Sam/AppData/Temp/check-k3/src/orders.js:7:22)'
    expect(findLocation(url, paths, dir)).toEqual({ path: 'src/orders.js', line: 7, column: 22 })
  })

  it('reads a path in the workspace folder itself', () => {
    expect(findLocation(`${dir}/src/orders.js:5:1`, paths, dir)).toEqual({
      path: 'src/orders.js',
      line: 5,
      column: 1
    })
  })

  it('reads a type error from the type checker', () => {
    const output =
      "src/parse.ts(12,7): error TS2322: Type 'string' is not assignable to type 'number'."
    expect(findLocation(output, paths, dir)).toEqual({ path: 'src/parse.ts', line: 12, column: 7 })
  })

  it('reads a relative path from the test runner', () => {
    const output = ' FAIL  src/orders.test.js\n ❯ src/orders.js:9:11'
    expect(findLocation(output, paths, dir)).toEqual({ path: 'src/orders.js', line: 9, column: 11 })
  })

  it('finds nothing when no path is a script of the workspace', () => {
    expect(findLocation('Expected 1300, got 1200', paths, dir)).toBeUndefined()
    expect(findLocation('    at x (/opt/other/src/orders.js:3:4)', paths, dir)).toBeUndefined()
    expect(
      findLocation('    at x (/var/tmp/check-a/lib/orders.js:3:4)', paths, dir)
    ).toBeUndefined()
    expect(findLocation('see notes.md:3', paths, dir)).toBeUndefined()
    expect(
      findLocation('    at x (node:internal/modules/run_main:123:26)', paths, dir)
    ).toBeUndefined()
  })
})
