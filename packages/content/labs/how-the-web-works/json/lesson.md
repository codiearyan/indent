# JSON going out and coming back

## What you will be able to do

Every answer so far was a line of text that a person could read. Programs need more than that: they need to know which part of the text is the name and which is the time. In this part of the repo you send and receive data, and it starts with the way most programs write data down. By the end of this issue you will be able to:

- read and write JSON, and say which values it can hold
- turn JSON text into values with `JSON.parse`, and back with `JSON.stringify`
- read an answer whose body is JSON
- decide from the `content-type` whether a body is JSON before you read it as JSON

## The request from Odette

> **Odette:** The listings screen puts each show in three columns: the show, the time and the presenter. Since we added Tea, Toast and Tunes on Friday mornings, the show column says "Tea" and the time column says "Toast and Tunes". Gethin says the server can now answer in a way that keeps the parts apart. Can the screen use that?

The screen cuts each line of `/shows` at its commas, and the new show has commas in its name. Gethin has added `/api/shows`, which answers with the same listings as JSON.

## Text that holds values

**JSON** is a way to write values as text, so they can travel in a body or sit in a file. It looks like JavaScript, with stricter rules. Here is one day of a weather forecast:

```json
{
  "town": "St Elvy, on the coast",
  "days": 3,
  "dry": false,
  "warnings": ["wind", "fog"],
  "pollen": null
}
```

- An **object** is in curly brackets, with names and values. Every name is in double quotes.
- A **list** (an array) is in square brackets.
- Text is always in double quotes, never single ones. A double quote inside text is written `\"`.
- Numbers, `true`, `false` and `null` are written as they are.

That is all JSON can hold. There is no `undefined`, no functions and no comments. Because each value is marked where it starts and ends, a comma inside a town's name is just part of the text.

## From text to values and back

`JSON.parse` reads JSON text and gives back the values it describes. `JSON.stringify` does the opposite:

```js
const forecast = JSON.parse('{"town": "St Elvy, on the coast", "days": 3}')
forecast.town // 'St Elvy, on the coast'
forecast.days // 3, a number again

JSON.stringify({ town: 'Fen & Marsh', days: 5 }) // '{"town":"Fen & Marsh","days":5}'
```

Before `JSON.parse`, the forecast is one piece of text, and `text.town` is `undefined`. After it, you have an object to read from, with numbers that are numbers again.

Text that is not JSON makes `JSON.parse` stop with a `SyntaxError`. The message quotes where it went wrong:

- `Unexpected token 'N', "Now playin"... is not valid JSON`: plain text where JSON was expected.
- `Unexpected token '<', "<!doctype "... is not valid JSON`: a web page, often an error page.
- `Unexpected end of JSON input`: the text is empty, or stops before its last bracket.
- `Unterminated string in JSON at position 48`: the text stops in the middle of a quote.

## JSON in an answer

A server that answers with JSON says so in the answer's `content-type` header: `application/json`, often with a `charset` after a semicolon, as in `application/json; charset=utf-8`. The answer from `fetch` has a method that reads the body and parses it in one go:

```js
const response = await fetch('https://weather.example/forecast?town=St+Elvy')
const forecast = await response.json()
forecast.warnings.map((w) => w.toUpperCase()) // ['WIND', 'FOG']
```

`response.json()` is a way of reading the body, like `response.text()`, so it needs `await` and can be used only once per answer. It gives back whatever the JSON holds: an object, a list, or even plain text or a number.

One thing it does not do is look at the `content-type`. It tries to parse whatever arrived, and stops with a `SyntaxError` when that is not JSON.

## Trust the label

A server does not always answer with what you hoped for. A gateway in front of it may answer with an HTML error page, and a page that is meant to be JSON may answer with a plain sentence instead. The `content-type` is how the server tells you what the body is, so decide by it before you read the body as JSON. Remember the `charset` that may follow: a test that compares the whole header with `'application/json'` fails for `application/json; charset=utf-8`. `startsWith` is the usual way to check.

And when an answer says it is JSON but is not, that is a broken server, not a different kind of answer. Let the `SyntaxError` come out, so whoever runs the program sees what went wrong.

## Your work in this issue

Open `src/json.js`. Task 1 reads one show from JSON text. Task 2 asks the cupboard server for all the shows as JSON and gives back their names. Task 3 reads a body as JSON only when the answer says it is JSON.

Run `node run.js` after each task. Look at the `content-type` of each answer it prints: `/api` answers say `application/json`, and the old paths still say `text/plain`. Gethin's half written `/api/now` says JSON and stops in the middle. Check uses a server of its own, with shows and bodies of its own.
