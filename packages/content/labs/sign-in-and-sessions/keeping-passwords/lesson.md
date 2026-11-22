# Never keep the password

## What you will be able to do

The workshops API you built for Kilnworth Pottery works. Ivo's sign-up page reads from it, and Sunniva's front desk changes workshops with the staff key in a header. In this repo every member of staff gets a sign-in of their own instead, one issue at a time. It starts where every sign-in starts: with what the API keeps instead of a password. By the end of this issue you will be able to:

- explain why a password is never stored, not even in a private store
- hash a password with a salt, using only `node:crypto`
- check a password against its hash, in constant time
- save staff members with a hash in place of their password

## The request from Dilys

Dilys owns the studio. Her note came after a quiet word with Kofi.

> **Dilys:** Kofi says the staff key has been on a sticky note by the till, in two group chats and on the back of a class plan. I want everyone to sign in as themselves. And I read about a booking site that was broken into and every password came out in plain text. That must never happen to us. Can the API remember our passwords without knowing them?

It can. The API never needs the password back. It only needs to tell, when someone types one, whether it is the same password as before.

## Hashing: a one-way trip

A **hash function** turns any text into a fixed-size jumble of bytes. The same input always gives the same output, a tiny change in the input changes the whole output, and there is no way to run it backwards.

```js
import { createHash } from 'node:crypto'

createHash('sha256').update('glaze').digest('hex')
// '3eca33ba9df7ef990634197e190c40e458a6a63c758f7c6d6d95ab96d7b63979'
```

So the API stores the hash, and when someone signs in it hashes what they typed and compares. If the store ever leaks, the thief has hashes, not passwords.

Encryption is not the same thing. An encrypted password can be decrypted by whoever holds the key, and the key sits on the same server. A hash has no key to steal.

## Salt: the same password, a different hash

A plain hash has a weakness: the same password always gives the same hash. Two staff members who both pick `summer2026` have the same stored value, and an attacker can hash a list of a million common passwords once and look every stolen hash up in it.

A **salt** fixes that. It is a few random bytes, new for every password, mixed into the hash and stored next to it. Now `summer2026` gives a different hash for each person, and every guess has to be made again for every single account.

```js
import { randomBytes } from 'node:crypto'

randomBytes(2).toString('hex') // '4c1e', and something else next time
```

The salt is not a secret. It is stored in plain sight beside the hash, because checking a password later needs it. Its only job is to be different every time.

## Slow on purpose

SHA-256 is built to be fast. A laptop makes millions of them a second in plain JavaScript, and special hardware makes billions. That is fine for checking a download, and terrible for passwords: a stolen hash can be tried against billions of guesses a second.

A password hash should be slow, and should need a lot of memory, so that each guess costs real time. **scrypt** is one such function, and it is built into Node:

```js
import { scryptSync } from 'node:crypto'

scryptSync('glaze', '4c1e', 16).toString('hex')
// '68d04e43ad03c81f3c8d643fbca8b9f6'
```

The first argument is the password, the second the salt, the third how many bytes of hash you want. Each call takes around a fiftieth of a second on a laptop. Nobody notices that when they sign in once; an attacker trying a billion guesses notices a great deal.

## Checking a password in constant time

To check a password, you hash what was typed with the stored salt, then compare the two hashes. How you compare matters. `===` stops at the first character that differs, so a guess that gets the first part right takes a little longer to refuse. Over many tries, that difference in time can be measured, and it leaks how close a guess is.

`timingSafeEqual(a, b)` from `node:crypto` compares two Buffers and always looks at every byte, whatever they hold. It needs both to be the same length, and throws a `RangeError` when they are not, so look at the lengths first.

A Buffer becomes hex text with `.toString('hex')`, and hex text becomes a Buffer with `Buffer.from(text, 'hex')`.

## Your work in this issue

Start in `src/passwords.js`: write `hashPassword`, then `verifyPassword`. Then write `addStaff` in `src/staff.js`, which saves a person through the staff store in `src/staffStore.js` with a hash in place of the password. The store is written for you.

Run `node try.js` after each task. It hashes the same password twice, checks a right and a wrong password against the first hash, then saves the team from `src/team.js` and prints everything the staff store holds. When you are done, the two hashes differ, the right password gives `true`, and no password appears anywhere in the store.
