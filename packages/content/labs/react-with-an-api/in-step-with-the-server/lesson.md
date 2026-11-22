# Keeping the screen in step

## What you will be able to do

People can book places now, and the form handles a slow server and a refusal. But after a booking the card still shows the places left from before, and after "this workshop is full" it still offers a place. The screen and the server disagree. By the end of this issue you will be able to:

- update a list in state from what the server says, never from a guess
- choose between the two honest ways to do it
- refresh data without wiping the screen while it travels

## The request from Ivo

Ivo booked a place to test the screen, and then another, and the card did not move.

> **Ivo:** Glazing basics said one place left after I booked the last one. Then Sunniva took a phone booking for the family morning, and my screen had no idea. I don't want to reload the page after every booking. Can the cards just be right?

## The form tells App

`BookingForm` now calls `onBooked(answer)` after a booking works, with the server's answer: `{ booking, workshop }`. That `workshop` is the booked workshop as the server has it after the booking, places left included. `App` has an empty `handleBooked` waiting for you.

## The list is a copy

The workshops in state are a copy of what the server said when the screen asked. The moment anyone books, at this screen or at the front desk, the copy is out of date. There are two honest ways to bring it back in step, and one that looks right but is not.

**Use the server's answer.** Many APIs answer a change with the thing as it is now. Put that workshop into the list in place of the old one. In React that means a new array, never a change to the old one, because React only draws again when it gets a new value:

```jsx
setKilns((list) => list.map((kiln) => (kiln.id === changed.id ? changed : kiln)))
```

This is cheap: no extra request. It only knows about the one thing that changed.

**Ask again.** Request the whole list after the change. It costs one more request, and it brings in everything that changed since, including other people's bookings.

**Count it yourself.** Taking one off the old number is tempting, and on a quiet day it even gives the same result. But the screen does not know what happened at the front desk in the meantime. It shows a number the server never said. Ivo's "one place left" was this kind of number.

Both honest ways are fine, and real screens use both. You will need asking again anyway, for the case where the answer brings no workshop at all.

## When no answer comes with the truth

When a booking is refused because the workshop is full, the refusal says no, and nothing else. The card still offers a place, and the next person to try will be refused too. The screen should ask for the list again, so the card shows the workshop is full.

For that, `App` has to hear about a refusal, and it does not yet. A component tells its parent about something by calling a function it was given as a prop, the way the form already calls `onBooked`.

To ask again, you already have what you need: the effect that loads the list runs again when `attempt` changes, and Try again changes it.

## A refresh is not a first load

Try again sets the status back to `'loading'`, and that is right after a failure: there is nothing to show, so the loading line says why. A refresh after a booking is different. The screen already has a list, slightly out of date, and wiping it for a loading line makes every card disappear and jump back a moment later.

Keep the two moments apart. A refresh asks again and leaves the status as it is, so the cards stay until the new list replaces them. Only a first load and Try again show the loading line.

## Your work in this issue

Everything happens in `src/App.jsx`, with one change to `src/BookingForm.jsx`. First write `handleBooked`, so the booked card shows what the server says. Then ask for the list again after a refused booking. Last, make sure that refresh keeps the cards on the screen.

In `server/settings.js`, set `busy: true` and the front desk books places too, now and then, whenever your screen talks to the stand-in. Book a few places at one workshop and watch its card: sometimes it should drop by more than one. A reload does not help to compare, because it starts the stand-in again from the start of the week.
