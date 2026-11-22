# Passwords in the log

## What you will be able to do

The Larkspur Letterpress portal now keeps customers to their own orders and its downloads to their folder. The last ticket is about what the portal writes down about itself. By the end of this issue you will be able to:

- name the secrets a sign in touches and say why each one matters
- reproduce a log line and a message that give a secret away
- fix the code so logs and messages say what happened, never what was typed
- write a test that catches the fix which hides only one secret

## The ticket

Deshawn Pirelli forwards a message from the contractor who helps with the site now and then.

> **Deshawn:** Our contractor was reading the portal log to chase a slow page and stopped to tell us something. The log is full of customers' passwords, and lines with session ids in them. On top of that, a customer who mistyped a password got an error page with two long strings of letters and numbers. The contractor did not try anything, but anyone with the log could. LL-26.

A few lines from the log:

```
sign in attempt {"email":"greta@example.com","password":"..."}
signed in customer 101 with session 3f9a...
```

## The idea: secrets travel further than you think

A log is written for people: the team, a contractor, a support tool, a backup somewhere. It is kept for months and copied around. Anything that goes into a log goes to all of them.

A sign in touches three secrets.

- **The password** the customer typed. With it, anyone can sign in as them, here and on every other site where they used it.
- **The session token** made after a good sign in. The browser sends it with every request to say who is signed in. Whoever holds it is that customer, with no password needed.
- **The password hash**, what the portal stores instead of the password. It cannot be turned back into the password, but it can be tested against guesses as fast as a computer can make them, without ever asking the portal. Short passwords fall quickly.

None of these should ever reach a log, and only one of them should ever reach the customer's browser: the token, handed back to the person who just signed in.

## How it happens

Nobody writes "log the password" on purpose. It happens in honest, helpful lines. Take a different program, a newsletter tool that talks to a mail service:

```js
log(`sending ${JSON.stringify(request)}`)
throw new Error(`Mail service said no: ${url}`)
```

The first line logs the whole request, and the request carries an API key. The second puts the full address in an error message, and the address carries the key as well. Both lines were written to make debugging easier. Copying a whole object into a log, or a value into an error, copies whatever it holds, today and after someone adds a field to it next year.

Errors sent to users are the same trap facing the other way. A message that says "expected hash 9f2c..." helps nobody sign in, and it hands the hash to whoever reads it.

## How to fix it: write what happened

A good log line says what happened, to whom and how it ended: `sign in failed for cosmo@example.com`, `signed in greta@example.com`. It does not repeat what was typed. Build each line from the facts you choose, never from a whole object, so a new field cannot slip in later.

A good message for the customer says what they can do: "Email or password is wrong." It says nothing about why inside, and it reads the same whether the email or the password was wrong.

Hiding one secret is not the fix. Taking the token out of one line, while another line still writes the whole form, leaves the password in the log. Look at every place a value leaves the function: every log line, every message, and the console too, because on a server the console ends up in a log as well.

Keep the log, though. The team still needs to see who tried to sign in and when. A fix that logs nothing trades one problem for another.

## How to reproduce it

Run the demo:

```
node src/demo.js
```

It signs Greta in, lets Cosmo mistype, and prints each log line. `signIn()` takes the log as a function, so in `src/reproduce.js` you can hand it one that pushes every line into an array. Sign in once and return the form, the lines and the result. A secret in one of them is the proof you attach to LL-26.

## How to test it

Collect the log lines in an array, sign in, then check every line and the message for every secret you know: the password you typed, and the token you got back. Do it for a right password and for a wrong one.

## Your work in this issue

Start in `src/reproduce.js`, then fix `src/signIn.js`, then write `src/signIn.test.js`. Run your tests with `npx vitest run src/signIn.test.js`. The check runs them beside the original code, a correct fix and a fix that only hides the token, and expects fail, pass, fail.
