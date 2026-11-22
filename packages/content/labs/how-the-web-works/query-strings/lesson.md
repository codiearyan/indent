# The question mark part

## What you will be able to do

The listings screen works again: it builds a whole address and reads the cupboard server's answer. A path says which page you want, but many pages also need to know more, like what to search for or which page of results to show. That goes in the part of the address after a question mark. By the end of this issue you will be able to:

- read the names and values in the question mark part of an address
- say which characters break it, and why
- build a question mark part that arrives exactly as typed, with `searchParams`
- remember that every value in it is text

## The request from Ffion

> **Ffion:** On the Saturday late show listeners text me their song requests, and I look each song up on the cupboard server before I play it. Most searches work. But Mabli & the Moths never shows up, and Gethin says the server thinks I asked for an artist called "Mabli ". Same with Hale + Holloway. Can you make the search send what I typed?

Ffion presents The Saltings Late Show. The cupboard server has a search page, `/songs/search`, that looks for an artist and, if you like, a title.

## Names and values after the question mark

Here is an address for a weather service that has a question mark part:

```
https://weather.example/forecast?town=St+Elvy&days=3
```

Everything after `?` is a list of names and values. Each pair is written `name=value`, and pairs are joined with `&`. This one says: the town is "St Elvy", and show 3 days. The server reads these, decides what to answer, and the path stays the same for every town. You will often hear this part called the query string.

There is one more mark: anything after a `#` is never sent to the server at all. A browser keeps it for itself, to jump to a place on the page.

## Characters that mean something

Because `&`, `=`, `#` and `?` have jobs in an address, a value cannot simply contain them. Picture a town called "Fen & Marsh":

```
https://weather.example/forecast?town=Fen & Marsh&days=3
```

The server reads a town called "Fen " and then a name " Marsh" with no value. To send such characters, an address **encodes** them: it writes a code in their place. `&` becomes `%26`, `#` becomes `%23`, `%` itself becomes `%25`, and a space becomes `+` or `%20`. Because `+` stands for a space, a real plus sign has to be encoded too, as `%2B`. The server decodes the codes back into the characters, so it reads exactly what was typed.

Nobody remembers these codes, and you do not have to. Joining text with a template literal is how they get forgotten. Let `URL` do it.

## Reading and writing with searchParams

Every `URL` has a `searchParams` property that holds the question mark part as names and values, already decoded:

```js
const url = new URL('https://weather.example/forecast?town=Fen+%26+Marsh&days=3')
url.searchParams.get('town')  // 'Fen & Marsh'
url.searchParams.get('wind')  // null, there is no such name
url.searchParams.has('days')  // true
```

To build one, start from the address without the question mark part and `set` each value. `set` encodes it for you, and replaces a value that is already there instead of adding a second:

```js
const forecast = new URL('/forecast', 'https://weather.example')
forecast.searchParams.set('town', 'Fen & Marsh')
forecast.searchParams.set('days', '5')
forecast.href // 'https://weather.example/forecast?town=Fen+%26+Marsh&days=5'
```

A value you do not have should not be in the address at all. A parameter that was not given is `undefined`, and setting it anyway sends the word "undefined" as text, which a server takes at its word. Use an `if` to set only what you have.

## Every value is text

An address is text from end to end, so every value read from it is text, even one that looks like a number. `searchParams.get('days')` gives `'3'`, not `3`, and `'3' + 1` is `'31'`. Turn a value into a number with `Number()` before you count with it, and remember that a value that is not there gives `null`, so decide what it means when it is missing.

## Your work in this issue

Open `src/search.js`. The four tasks go in order: read a value, build the search address, send the search, and ask for the next page of results. Task 3 can call the function you write in Task 2.

Run `node run.js` after each task. Look at the request line under each request: it shows the question mark part exactly as it went to the server. The first line of each search answer says what the server read, so a value that broke on the way shows there at once. Check uses its own server, with artists and titles of its own.
