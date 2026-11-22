# Anyone's order by its number

## What you will be able to do

Larkspur Letterpress's search and order cards are safe now. The next ticket comes from a customer who did nothing more clever than edit a link. By the end of this issue you will be able to:

- tell the difference between knowing who someone is and knowing what they may see
- reproduce a customer opening another customer's order by changing a number
- fix the lookup so the signed-in customer decides what comes back
- write a test that catches the fix which says too much

## The ticket

Ottilie Ferraby owns the studio, and forwards an email from a customer with one line on top.

> **Ottilie:** Please read this today. LL-19.
>
> **Cosmo:** Hello, I was checking my menu boards and noticed the address bar said /orders/2042. Out of curiosity I typed 2041 instead, and I got someone's wedding invitations, with their name, their note and their home address. I closed it straight away, but I thought you should know.

Cosmo is right, and was kind to tell. Anyone signed in can walk through every order the studio has ever taken, one number at a time.

## The idea: signed in is not the same as allowed

The portal checks two different things, and it only does the first.

The first is who you are. You sign in, the portal makes a session, and every request carries it. That part works: `session.customerId` is always the person really signed in.

The second is what you may see. Being signed in says nothing about which orders are yours. That has to be checked for every single thing a request asks for, and `getOrder` never checks it. It takes the number from the link, finds that order, and hands it over.

Take a different shop, a gym where members book classes:

```js
function getBooking(db, session, bookingId) {
  return db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId)
}
```

Every member can read every booking, because the only question asked is "does booking 815 exist?". The question it should ask is "does booking 815 exist and belong to this member?".

## How to fix it: the session decides

The fix is to make whose it is part of the question, and to take the answer from the session, never from the request:

```sql
SELECT * FROM bookings WHERE id = ? AND member_id = ?
```

with the booking number and `session.memberId` as the two values. A booking of someone else is then simply not found. The order list on the portal already works this way, which is why nobody ever saw another customer's orders in their list.

Notice where the check lives. It is inside the one function every order page uses, so a new page cannot forget it. A check in each page is a check some page will miss.

## Say nothing about other people's orders

When the order is not theirs, what should the customer get? The tempting answer is an error: "Order 2041 belongs to another customer." It feels honest, but it tells them something. Now they know 2041 is a real order, and the same message for 9999 would say it is not. Someone can map out every order you have, and how busy you are, without opening one.

So an order that is not theirs gets exactly the same answer as an order that does not exist: `null` here, a plain "not found" page in the browser. From the outside, the two must be impossible to tell apart.

## Long random numbers are not the fix

Another tempting fix is to give orders numbers nobody can guess. That makes guessing harder, but it does not decide who may see what. Links get forwarded, pasted into chats and kept in browser history. Once a link is out, the long number is just a password written in the open. Use hard-to-guess ids if you like, and check ownership anyway.

## How to reproduce it

Run the demo:

```
node src/demo.js
```

It shows Greta's order list and opens two links as Greta. In `src/reproduce.js`, sign in as one customer and open an order that belongs to another. Someone else's address on the screen is the proof you attach to LL-19.

## How to test it

Call `getOrder()` with a fresh `openDb()` and a session. Open another customer's order and say exactly what should come back: the same answer as for a number with no order at all. Keep one case where a customer opens their own order, so the fix cannot simply hide everything.

## Your work in this issue

Start in `src/reproduce.js`, then fix `getOrder` in `src/orders.js`, then write `src/orders.test.js`. Run your tests with `npx vitest run src/orders.test.js`. The check runs them beside the original code, a correct fix and a fix that throws an error naming the other customer's order, and expects fail, pass, fail.
