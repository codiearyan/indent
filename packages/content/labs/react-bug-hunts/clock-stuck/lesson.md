# The session clock stops after one second

## What you will be able to do

Brimwell Lido is a seawater pool on the harbour wall. Swimmers come in sessions of 45 minutes, and between sessions the lifeguards clear the pool. The desk screen was written in React over one busy spring, and the staff trust it more than they should. You are the lido's developer, and the tickets have started. By the end of this issue you will be able to:

- see why a function made in one draw keeps reading that draw's state
- spot the same mistake in a timer and in a handler
- mend it by updating from the newest state, not by adding a delay
- check that the fix holds while the screen draws again and again

## The ticket

Kwabena is the head lifeguard. He keeps the gate screen on the poolside desk.

> **Kwabena:** The session clock said 44:59 for the whole of the ten o'clock session. Nobody blew the whistle, and the next lot queued in the sun for twenty minutes. The gate count looks odd too, now I think of it. Can you look at BL-31?

## See it for yourself

Open the Browser panel. The gate shows a clock that starts at 45:00.

1. Watch the clock. After one second it shows 44:59, and then it stays there.
2. Press One in twice. The count goes to 2, as it should.
3. Press Family ticket. A family is two adults and two children, so the count should go up by four. It goes up by one.

Nothing in the console. The timer is running, the buttons call their handlers, and every number on the screen is wrong anyway.

## State from an old draw

Every draw of a component is a call of its function, and every call has its own constants. In one draw, `secondsLeft` is one fixed number. Setting state does not change it; it asks React for the next draw, where `useState` will return the new number.

A function made inside the component sees the constants of the draw it was made in. Here is a café screen that counts cups of tea:

```jsx
function Teas() {
  const [cups, setCups] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setCups(cups + 1), 60000)
    return () => clearInterval(timer)
  }, [])
  return <p>{cups} cups sold</p>
}
```

The effect runs once, in the first draw, where `cups` is 0. Its timer's function was made in that draw, so every minute it asks for `0 + 1`. The screen shows 1, and then 1 for ever. The timer is fine; the value it reads is from a draw long gone.

A handler does the same thing within one click. If it asks for `cups + 1` twice, both read the same `cups`, and two requests for the same number count once.

## How to mend the cause

Hand the setter a function instead of a value. React calls it with the newest state, after every change already asked for in the same click or tick:

```jsx
setCups((now) => now + 1)
```

Now the timer made in the first draw no longer reads anything from that draw. Each tick starts from what the screen holds now, and two such calls in one click count twice. Anything that depends on the newest value, like a limit to check against, belongs inside that function too, or it will still be read from the old draw.

The function you hand the setter should only work out the next value: React may call it more than once while you develop. It must not change anything else.

## When a blunt fix makes it worse

There are quicker ways to make the clock move, and each breaks something next to it.

- **Taking the dependency list away.** The effect then runs after every draw, so the timer is started over every time staff press a button. On a busy gate the clock falls behind.
- **Taking the cleanup away.** In `StrictMode` the effect runs twice when the screen appears, and without a cleanup two timers tick: the clock runs at double speed.
- **A variable outside the component.** It is shared by every gate on the page and outlives New session, so the clock goes on from an old count.
- **A delay with `setTimeout`.** It only moves the stale read to later.

## Your work in this issue

Everything happens in `src/Gate.jsx`. First mend the clock, then find the same cause in the gate count, then make sure the clock still keeps time while buttons are pressed and after New session. `src/lido.js` holds the pool's limit and the session length; the checks draw the gate with values of their own, and move time on with a clock of their own, so they never wait.
