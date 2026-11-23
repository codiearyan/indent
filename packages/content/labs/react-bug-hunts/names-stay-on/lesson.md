# A swimmer taken off stays on the board

## What you will be able to do

The lane board on the desk shows who swims in which lane this session, with the lane's speed and whether it is closed. Swimmers book ahead, and staff add and take off names all morning. By the end of this issue you will be able to:

- explain why React draws nothing when it is handed the same array
- spot a change made in place, even when the screen happens to look right
- mend it with new arrays and new objects, and keep every field the old ones had
- check that each change touches one lane and nothing else

## The ticket

Agnieszka runs the front desk.

> **Agnieszka:** I took Hettie off lane 1 when she left, and she stayed on the board. When I started typing the next name she vanished. And after New session the board had names on it from the last session, people who never booked. Can you look at BL-36?

## See it for yourself

Open the Browser panel. Lane 1 has Hettie and Jonah.

1. Press Take off beside Hettie. Nothing happens.
2. Type one letter in the name box. Hettie disappears.
3. Type a name, pick lane 2 and press Add. The name shows at once.
4. Press New session. The name you added is still there, and Hettie is still gone.

The first two steps are the ticket. The last two are the same cause in a second place, hiding behind a screen that looks right.

## Same array, no new draw

When a setter is called, React compares the new value with the one it holds. For an array or an object, "the same" means the very same one, not one with the same contents. Hand it the same array and React decides nothing changed, and draws nothing.

Here is a kiosk that sells ice lollies:

```jsx
function sell(flavour) {
  stock[flavour] = stock[flavour] - 1
  setStock(stock)
}
```

The count changes inside the object React already holds, and React is handed that same object back. No draw. The next time anything else draws the kiosk, the new count suddenly shows, at a moment that has nothing to do with the sale. There is no error and no warning.

Worse, the object may not belong to the component at all. State that starts from a prop starts as that very object. Change it in place and you change it for whoever passed it in. On the lane board, the lanes in state are the morning's bookings themselves, so every name pushed in is written into the bookings, and New session brings it back.

## How to mend the cause

Treat everything in state as read-only. To change it, make a new one with the change:

```jsx
setStock({ ...stock, [flavour]: stock[flavour] - 1 })
```

For a list of objects, make a new list, and in it a new object in place of the one that changes:

```jsx
setKiosks(kiosks.map((k) => (k.id === id ? { ...k, open: false } : k)))
```

`map` and `filter` return new arrays and leave the old one alone. `push`, `splice`, `sort` and assigning to a field change what they are called on, so they never touch state directly. The spread copies the old fields first; the field written after it is the change.

## When a blunt fix makes it worse

- **Copying only the outer array.** `setLanes([...lanes])` after a `splice` makes React draw, but the lane inside is still the booking's own, changed in place. New session still brings back the wrong board.
- **Forcing a draw with a state that holds nothing.** The screen updates, and the bookings are still changed underneath.
- **Making the new lane from scratch.** A lane written as `{ swimmers: ... }` loses its number, its speed and whether it is closed.
- **Taking off by name.** Two swimmers in one lane can share a name; take off the one at the place that was pressed.

## Your work in this issue

Everything happens in `src/LaneBoard.jsx`. First make Take off draw at once without touching the bookings, then do the same for Add, then make sure each change leaves the rest of the board as it was. The toggle that closes a lane is already written the right way: read it before you start. `src/lanes.js` holds this morning's bookings; the checks use bookings of their own.
