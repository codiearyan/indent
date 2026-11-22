// What a browser builds from an order card's HTML: the words people see in each part, the value
// in the note field, every element and every event attribute such as onclick. Scripts never run
// here, so it is safe to read any card with it.
import { JSDOM } from 'jsdom'

export function readCard(html) {
  const { document } = new JSDOM(html).window
  const elements = [...document.body.querySelectorAll('*')]
  const text = (selector) => document.querySelector(selector)?.textContent.trim() ?? null
  return {
    title: text('h2'),
    customer: text('.customer'),
    status: text('.status'),
    note: text('.note'),
    noteField: document.querySelector('input[name="note"]')?.value ?? null,
    tags: elements.map((el) => el.tagName.toLowerCase()),
    handlers: elements.flatMap((el) => el.getAttributeNames().filter((name) => name.startsWith('on')))
  }
}
