# Measure before you change anything

## What you will be able to do

You can write JavaScript that gives the right answer. This repo is about the next question: the answer is right, so why does it take so long? You will take one slow program, find out where its time goes, and make it fast one cause at a time, without changing a single line of what it prints. It starts the way every honest speed-up starts: by measuring, before touching anything. By the end of this issue you can:

- time a function fairly, so one lucky or unlucky run does not fool you
- time the steps of a program and say which one the time goes on
- count the work a function does, a number that is the same on every computer

## The request from Idris

Ashgrove Press is a letterpress shop with two old presses, run by Hesper. Sefton works the counter and writes the small programs the shop runs on; Idris keeps the books. Every night Sefton's report reads every order the shop has ever taken and prints the takings, the customers by spend, the days of this month and the trade invoices not paid yet.

> **Idris:** When Sefton wrote the report, we had about a hundred orders and it took a minute. We have fifty thousand now, and this morning it was still running when I came in to do the books. Sefton wants to rewrite the lot. Hesper says nobody rewrites anything until we know what is slow.

Hesper is right. People are bad at guessing where a program's time goes, and rewriting the wrong part saves nothing. Open `src/report.js`: it is Sefton's report, and you will make it fast over this repo. `src/old-report.js` is the same code, which you leave alone, so you can always compare the two.

## Where the night goes

Look at `buildReport` at the bottom of `src/report.js`. It does three steps of work on this computer, which `src/try.js` names **match** (each order with its customer and its price), **money** (the customers ranked by spend, and the days of the month) and **print** (the text). Then there is a fourth part that is not work at all: for every trade order, it asks the shop's payments service whether the invoice was paid, and waits for the answer. Each answer takes about four seconds.

Those are two different kinds of slow. Work is time this computer spends. Waiting is time another computer spends while yours does nothing. You measure work with a clock, and you measure waiting by counting the questions: four seconds times thousands of questions is hours. Hesper has written to the payments company to ask how many questions at once they allow, and until they answer, that part stays as it is. The work is yours to measure today.

## One run tells you little

`performance.now()` returns the time in milliseconds, with fractions, from a clock that only goes forward. Read it before and after a call, and the difference is how long the call took:

```js
const start = performance.now()
buildShelves(boxes)
console.log(performance.now() - start)
```

Run that three times and you get three numbers. Other programs share the processor, the computer slows down to save power, and now and then JavaScript stops to clear away memory nobody uses any more. The first run is usually the slowest of all: the engine first reads your function as it is, and only turns it into fast machine code once it sees the function being used.

So a fair timing runs the function once without timing it, times it several times, and reports the time in the middle of the sorted list. An average is pulled up by one slow run; the middle is not. The fastest run is a time you will rarely see again.

## Counting, which no computer changes

Even a fair timing changes from one computer to the next and from one minute to the next. A count does not. When `sort` puts ten numbers in order, it calls the comparison function you hand it a certain number of times, and that number is the same on a laptop, on the workshop computer and in a check. Count the comparisons, the questions to the price list or the payments service, and you have a measure of work that is the same on every run.

Counts also show how the work grows. If doubling the orders doubles the count, the night grows with the shop. If the count becomes four times bigger, it will not stay a night for long. The Patterns in this app show how algorithms do their work step by step; this repo counts those steps in a real program.

That is why the checks in this repo never time anything. They count the work your code does with helpers and data of their own, and they compare your answer with the slow version's answer on the same data.

## Your work in this issue

All three tasks are in `src/measure.js`: `timeIt`, then `timeSteps`, which uses it, then `counted`. You will use these tools in every issue after this one. Try your work with:

```sh
node src/try.js
```

It builds a shop of thirty thousand orders, times the match step, then all three steps, then counts the comparisons, price questions and payment questions of one report. Add a number to try another size, such as `node src/try.js 60000`, and see which counts double and which grow faster.
