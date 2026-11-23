# Routes by hand

## What you will be able to do

Your server answers every request the same way, whatever was asked. Real servers answer many addresses, each in its own way, and say clearly when something was asked that they do not have. In this issue you do that by hand, with nothing but the request Node gives you. By the end of it you will be able to:

- read the method and the path of a request, and answer each address in its own way
- answer an address that is not there with 404, and a wrong method with 405
- read the query of an address with the URL tools built into Node

## The request from Rhiannon

> **Rhiannon:** The phones at the gate love the free plots. Now the noticeboard team wants the whole list, holders and all, so they can print it. And the people by the tap only care about their own row: could they ask for row B alone? Oh, and someone typed the address wrong and got the free plots anyway, which confused everybody.

## The method and the path

Every request starts with a line like `GET /free HTTP/1.1`. The first word is the **method**, what the visitor wants to do. `GET` means "give me this", and is what a browser sends when you open an address. `POST` means "here is something for you", and `PUT` and `DELETE` change or remove things. The second word is the **path**, which page of the server is asked for.

Node puts both on the request: `req.method` is `'GET'`, in capitals, and `req.url` is the path, `/free`. A **route** is one method and path the server answers. With a few routes, plain `if` statements are all you need:

```js
const server = createServer((req, res) => {
  if (req.url === '/hours') {
    res.end('The tool shed opens at 9.\n')
    return
  }
  if (req.url === '/tools') {
    res.end('Spades, forks, two wheelbarrows.\n')
    return
  }
  res.statusCode = 404
  res.end('No such page.\n')
})
```

The `return` after each answer matters. Without it the code goes on, and a second `res.end` for the same request stops the whole server with `Error [ERR_STREAM_WRITE_AFTER_END]: write after end`.

## When the request is wrong

The status says what went wrong, so other programs do not have to read your words. Statuses from 400 to 499 say the request was the problem. **404 Not Found** is for a path the server does not have, whatever the method. **405 Method Not Allowed** is for a path that is there but does not take this method, such as `DELETE /tools`. A 405 answer carries the header `Allow`, which lists the methods the path does take, such as `Allow: GET`.

Order your checks the way a person would think: first, is the page there at all? Then, is this method allowed on it? Then answer it.

## The query

An address can end with a **query**: a question mark and then names with values, joined by `&`.

```
/tools?kind=spade&size=small
```

The query is extra detail for the page, not a different page: `/tools?kind=spade` is still the page `/tools`. But `req.url` holds the whole thing, query included, so comparing it with `'/tools'` no longer matches. Cutting it apart yourself goes wrong too: names come in any order, and some characters are written in code, such as a space as `%20` or the letter L as `%4C`.

Node has the same URL tools as a browser, built in. `new URL()` takes a whole address, so give it the request's path and any computer's name to go with it:

```js
const url = new URL(req.url, 'http://localhost')
url.pathname                    // '/tools'
url.searchParams.get('kind')    // 'spade'
url.searchParams.get('colour')  // null: not in the query
```

`pathname` is the path alone, so compare that. `searchParams.get` gives a value already decoded, as text, or `null` when the name is not there. A query is typed by people, so treat its values like any setting: an empty value, a value in the wrong case, a value you did not expect.

## Your work in this issue

All three tasks are in `server.js`, which starts as the server from the last issue with the reading of `plots.txt` done for you. Run `node ask.js server.js` to send it the requests in `requests.txt`, and add lines there to try others. Write an address with a `?` in that file as it is. If you type one in a terminal instead, put it in double quotes, because some terminals read `?` and `&` as their own signs.
