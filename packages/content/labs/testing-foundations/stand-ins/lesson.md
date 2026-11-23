# Standing in for chance and for others

## What you will be able to do

The clock is under your control now. Two more things the farm's code talks to are not: chance, and the card company. Every box gets a surprise extra picked at random, and every order is paid for by a service that belongs to someone else. A test cannot know what chance will pick, and it must never charge a real card. By the end of this issue you will be able to:

- set what a random number will be, with `vi.spyOn`
- give code a fake function that records how it was called, with `vi.fn`
- check what a fake was called with, and how many times
- make a fake fail, and say what a fake cannot prove

## The request from Effie

> **Effie:** Two things. Mrs Pellow was charged twice for one box last week, and the week before someone paid 26 pence for a 26 pound box. And when a card is declined, I need to see why, and the box must not go on Wendell's list. Bridget also wants to know the surprise extras really come out, apples included. Can you test it all without charging anyone?

The code is in `src/checkout.js`. `surpriseExtra` picks one of `EXTRAS` at random. `checkout(order, cards, packingList)` asks `cards.charge(customer, pence)` to take the money, and puts a paid order on the packing list.

## Standing in for chance

Say the village fete draws its raffle winner like this:

```js
export function raffleWinner(names) {
  return names[Math.floor(Math.random() * names.length)]
}
```

`Math.random()` gives a number from 0 up to, but never quite, 1, and a different one every time, so a test that expects one name passes some days and fails on others. `vi.spyOn` can stand in for it:

```js
test('a random number of 0.5 picks the middle name', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  expect(raffleWinner(['Ada', 'Cora', 'Huw'])).toBe('Cora')
})
```

`vi.spyOn(Math, 'random')` swaps `Math.random` for a stand-in, and `mockReturnValue(0.5)` says what it gives back. Now you work the answer out by hand: 0.5 times 3 is 1.5, rounded down is 1, and `names[1]` is Cora. Check runs your tests with `Math.random` giving other numbers, so a test that leaves the pick to chance fails there.

## A fake function that records its calls

`checkout` is handed the card company as `cards`, so a test can hand it a fake one. Say the farm texts customers a reminder:

```js
export async function sendReminder(customer, texts) {
  try {
    await texts.send(customer.phone, `Your box comes on Friday, ${customer.name}`)
    return 'sent'
  } catch {
    return 'not sent'
  }
}
```

A fake function made with `vi.fn()` does nothing, but it records every call. `mockResolvedValue` makes it answer later, like the real service would:

```js
const ada = { name: 'Ada', phone: '07700 900123' }

test('sends Ada one text', async () => {
  const texts = { send: vi.fn().mockResolvedValue(undefined) }
  await sendReminder(ada, texts)
  expect(texts.send).toHaveBeenCalledTimes(1)
  expect(texts.send).toHaveBeenCalledWith('07700 900123', 'Your box comes on Friday, Ada')
})
```

The answer `'sent'` alone says little: the code could text the wrong number, or text twice, and still say it was sent. So check the calls. `toHaveBeenCalledWith` passes when any call had exactly those arguments, and `toHaveBeenCalledTimes` counts the calls. When the arguments differ, Vitest shows each call it recorded:

```
AssertionError: expected "vi.fn()" to be called with arguments: [ '07700 900123', …(1) ]

Received:

  1st vi.fn() call:

  [
    "07700 900123",
-   "Your box comes on Thursday, Ada",
+   "Your box comes on Friday, Ada",
  ]


Number of calls: 1
```

The lines with `-` are what the test expected and the lines with `+` what the code really sent.

## A fake that fails

The real service fails sometimes, and that path needs a test too. `mockRejectedValue` makes the fake reject, the way a service does when it says no:

```js
test('not sent when the text service fails', async () => {
  const texts = { send: vi.fn().mockRejectedValue(new Error('No signal')) }
  await expect(sendReminder(ada, texts)).resolves.toBe('not sent')
})
```

## Clean up, and what a fake cannot prove

Before every test, Vitest clears the calls each fake has recorded, so counting starts again at 0. It does not put back what `vi.spyOn` swapped: `Math.random` stays a stand-in for the rest of the file. Put it back in `afterEach` with `vi.restoreAllMocks()`.

A fake only answers what you told it to. If the real card company wanted pounds, your tests would still pass: the fake takes whatever it is given, and your test checks for pence because that is what you believe the company wants. Tests with fakes check that your code asks the right question and handles each answer. Whether the other side really works that way is checked against the service itself, by reading its documentation or trying it once with a test account.

## Your work in this issue

Open `src/checkout.test.js`; the code is in `src/checkout.js`. Each task has its own `describe` block. Run `npx vitest run src/checkout.test.js` after each test, and press Check when they all pass.
