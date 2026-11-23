# Knowing when to stop

## What you will be able to do

The report that ran all night now finishes in minutes, nearly all of them spent on the few payment questions that are really needed. This last issue is about what comes after a big win: measuring again instead of guessing, catching the speed-ups that make a program wrong, and knowing when fast is fast enough. By the end of this issue you can:

- measure again after a change and find the step that matters now
- spot a speed-up that changes the answer, such as an early `return` or a cache that outlives its data
- prove that a fast program gives exactly what the slow one gave

## The request from Hesper

> **Hesper:** It is fast enough now that I want it every hour on the order server, not once a night. Sefton made two more speed-ups himself before he set that up. Since then, Idris ran October again for the books and the 31st was missing. And at eleven this morning the report still had the old price for menus, though Idris changed it at ten.

Two speed-ups, two wrong answers. Neither showed up in the first report Sefton tried.

## Read the measurements again

Every fix moves the slowest step. The match step was first, then the money step; run `node src/try.js` now and the print step is the slowest of the three, though nobody changed it. It was always this slow. It only matters now because everything else is smaller.

Look inside `money`. Each amount makes a new `Intl.NumberFormat`, the object that knows how to write pounds in Britain, with the sign, the commas and the pence. Making one means loading those rules, and that takes far longer than using one. A report with four thousand amounts makes four thousand. This is the work-done-again of the third issue, found by measuring, not by reading.

## Faster and wrong

A speed-up is a change, and a change can break the answer. Two kinds are common enough to know by sight.

The first is stopping early. If the orders are in day order, a list of days up to a date can stop at the first order after it: nothing later can belong. That is a real saving. But a loop that adds up a group and puts it in the list only when the next group starts must still put in the group it was on when it stops. An early `return` that skips that line drops the last day, and only when the range ends before the last order. Tonight's report runs to the last order, so it looked fine.

```js
for (const box of boxes) {
  if (box.shelf > last) return shelves   // the shelf being counted is lost
  ...
}
```

The second is a cache that outlives its data. Prices kept for one report are true for that report. Kept for the life of a program that runs for days, they are true until Idris changes a price, and then wrong, quietly, in every report after. A cache needs an end: the end of the call that made it, or the moment its data changes. Keying it on the price list itself also works, since a new price list then finds nothing kept.

## Proving it is the same

You kept `src/old-report.js` beside your fast report for a reason. The surest test of a speed-up is to run both on the same data and compare the output exactly, character by character, on more than one size of data and after the data changes. That is what the checks of this repo have done all along, and what `src/try.js` does for the whole report before and after a price change.

## When to stop

The night is gone: the work takes a fraction of a second, and the payment questions several minutes, because only the unpaid invoices are asked about, four at a time. You could keep going. You could make the print step faster still, or ask for a bigger limit. None of it would change when Idris can start the books.

That is when to stop: when the measurement says the rest is too small to matter to the people who wait for the result. Every speed-up after that adds code to read and a chance to be wrong, for nothing anyone notices.

## Your work in this issue

All three tasks are in `src/report.js`: the print step's formatters, Sefton's `takingsByDay`, and the whole `buildReport`, which has to give Sefton's first report exactly, also when the price list changes between two reports. Try your work with:

```sh
node src/try.js
```

It times the three steps, lists October's days in both versions, and builds two reports in one run, before and after Idris raises a price, each compared with the old report. The check does the same with shops, a price list and a payments service of its own.
