# Lists people can use

## What you will be able to do

Bram has added three boats this week, and the booking page now loads the whole fleet on every visit just to show the doubles. By the end of this chapter you will be able to:

- read filters, a sort order and a page from the query string
- turn query text into typed values, and refuse values you cannot trust
- filter, sort and page a list without changing the original
- answer with an envelope that tells the client how many results exist

## The next message

> **Luka:** The page wants "available doubles, cheapest first", ten at a time. I am filtering in the browser right now and it feels wrong. Also, could you tell me how many there are in total? I need it for the page numbers.

He is right that it feels wrong. Filtering in the browser means sending every boat to every visitor, and the list only grows.

## The query string is text

`GET /boats?type=double&available=true&sort=-hourlyCents&limit=10&offset=0` carries five parameters. `URLSearchParams` parses them for you, but every value it gives back is a string, and a missing parameter is `null`.

That makes parsing a trust boundary, like the JSON body in chapter 2. JavaScript's number helpers are forgiving in ways that hurt here:

```js
Number('')         // 0
Number('1e3')      // 1000
parseInt('10abc')  // 10
parseInt('2.5')    // 2
```

Each of these turns nonsense into a number that looks fine. For a page size, accept digits only, check the range, and answer **400** with the code `invalid_query` when the value is wrong. Clamping `limit=500` down to 50 quietly would hide a bug in the client; saying so is kinder.

## Defaults and limits

Every parameter is optional, so each one needs a default: no type filter, no availability filter, sort by code, ten per page, starting at zero. The upper bound on `limit` matters most. Without it, `limit=1000000` asks the server to do as much work as the client likes.

`sort` packs two things into one value: the field and the direction. A leading `-` means descending, so `-hourlyCents` is the most expensive first. Only fields from a fixed list are allowed, which also keeps clients from sorting on fields you never meant to expose.

## Filter, sort, page, in that order

The order of the steps decides what the numbers mean:

1. **Filter** to the boats that match.
2. **Sort** them. When two boats tie, fall back to their code, so the order is the same on every request. Without a tie-breaker, a boat can appear on page 1 and again on page 2.
3. **Count** the matches. That is `total`.
4. **Slice** the page: skip `offset`, take `limit`.

Watch out for two traps. `available: false` is a real filter, so test for `null`, not for truthiness. And `Array.prototype.sort` sorts the array it is called on, so sorting the array you were handed reorders the caller's data. Sort a copy; `filter` already returns one.

## The envelope

A bare array cannot carry the total. Wrap the page in an object:

```json
{ "data": [ ... ], "total": 3, "limit": 10, "offset": 0 }
```

Now Luka can show "3 boats" and work out how many pages there are, and there is room to add more fields later without breaking anyone who reads `data`.

## Try it

Run `node try.js`. It asks for two pages of three boats, the doubles from most to least expensive, the boats that are off the water and finally a request with two bad parameters. When you are done the last one comes back as a 400 that names both of them.
