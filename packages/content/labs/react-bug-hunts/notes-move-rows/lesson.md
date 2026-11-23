# Notes moved to another child

## What you will be able to do

On Saturday mornings the lido teaches children to swim, and Kwabena takes the register on the desk screen: who is here, and a note for each parent at pick-up. Under the class is the waiting list, with a box to tick once a parent has been called about a place. By the end of this issue you will be able to:

- explain how React decides which row's state belongs to which item
- see why a key that names a place in the list hands one item's state to another
- mend it with a key that belongs to the item
- tell a key that is steady and unique from one that only looks it

## The ticket

> **Kwabena:** Arlo left early, so I took him off. Then the note I'd written for Bronwen, "lost her goggles", was sitting next to Esme, and the one for Rory was next to Suki. A parent nearly went home with the wrong message. Can you look at BL-40?

## See it for yourself

Open the Browser panel.

1. Type "lost her goggles" in the note box beside Bronwen, and anything beside Esme.
2. Press Left early beside Arlo.
3. Bronwen's note now sits beside Esme, and Esme's beside Rory.
4. On the waiting list, tick Bodhi as called, then press By age. The tick stays on the first row, which is now Lulu.

The names moved up a row. The notes and the ticks stayed where they were on the screen.

## How React matches rows

A note typed in a row lives in that row's own state, made with `useState` inside the row component. When the list draws again, React has to decide which new row is which old row, so each keeps its state. It does that by key: a row whose key was there before keeps that row's state; a key that is new gets a fresh row; a key that is gone loses its row.

Here is a list of lockers, each with a row that remembers a typed code:

```jsx
{lockers.map((locker, index) => (
  <LockerRow key={index} locker={locker} />
))}
```

The key is the place in the list. Take the first locker away and every other locker moves up one place. Locker 12 is now at place 0, and React hands it the row that had key 0: the first locker's row, with its typed code. Each row keeps its state and gets a different locker. React cannot warn about it, because the keys are unique. The screen just lies.

The same happens when a list is sorted, or an item is added anywhere but the end.

## How to mend the cause

Give each row a key that belongs to its item and stays with it: an id from the data.

```jsx
<LockerRow key={locker.id} locker={locker} />
```

Now when a locker leaves, React sees its key is gone and drops only that row. Every other key is still there, so every other row keeps its own state, wherever it moved.

A key must stay the same for one item in every draw, and differ from every other item's. Only a field made to name the item does both.

## When a blunt fix makes it worse

- **A key made fresh in every draw**, like `Math.random()`. Every draw throws every row away and makes new, empty ones. Tick a child here and every note on the register is gone.
- **The name as the key.** It looks steady, until two children in one class share a first name. React then warns `Encountered two children with the same key` in the console, and the two can be mixed up.
- **The name and the place together.** The place still shifts when a row leaves, so the key changes and the row is thrown away.

Moving the notes up into `Register`, kept by child id, also works, but it does not mend the key: anything else a row holds, such as focus, would still move.

## Your work in this issue

Everything happens in `src/Register.jsx`. First keep the notes with their child in the class list, then the ticks on the waiting list, then make sure both stay put while the register draws for other reasons, with two children of the same name. `src/lesson.js` holds Saturday's class; the checks use classes of their own.
