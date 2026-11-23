# Streams: ask for the answer, not the steps

## What you will be able to do

Every question you have asked a list so far was a loop: make an empty list, walk, test, add, give back. A stream lets you say what you want instead, as a chain of steps, each a small function, and Java does the walking. By the end of this issue you will be able to:

- build a stream with `filter`, `map`, `sorted`, `distinct` and `limit`
- finish it with `toList`, `count`, `anyMatch` or `findFirst`
- say when a stream's steps run, and why a stream is used once
- read the long error a stream chain gives, by finding the one line that matters

## The request from Bridie

> **Bridie:** The harbour office keeps ringing with questions. Who is on the Gannet, each name once. How many bookings it has. The three biggest parties of the day. Is anyone bringing more than eight. And they want a list they can read later, not a pile of loops from me every time.

All three tasks are in `HarbourOffice.java`.

## A stream, from a list to an answer

At the market, the flavours of the jars heavier than 300 grams:

```java
List<String> heavy = jars.stream()
    .filter(j -> j.grams() > 300)
    .map(j -> j.flavour())
    .toList();
```

`stream()` starts from the list. `filter` keeps the items its `Predicate` says yes to. `map` turns each item into what its `Function` gives: here a jar into its flavour. `toList()` is the ending: it gathers what is left into a list and gives it back.

Order the steps by what each one hands on. After `map`, the items are flavours, so a `filter` that asks about grams has to come first. Put it after, and `j.grams()` is refused with `cannot find symbol`, because a `String` has no `grams()`.

`toList()` gives back a list that can never be changed. `collect(Collectors.toList())` does the same job and gives back one that can; use it when you will add to the list later.

## More steps

`sorted()` puts the items in their natural order, and `sorted(comparator)` in any order, as in the first issue of this part. Sorting a stream leaves the list it came from alone, and two equal items stay in the order they came. Things with no natural order stop the program at `sorted()`: `ClassCastException`, `cannot be cast to class java.lang.Comparable`.

`distinct()` drops repeats, by `equals`. `limit(3)` lets the first three through and no more. The order matters: `.sorted(...).limit(3)` gives the three first in that order; `.limit(3).sorted(...)` gives the first three of the list, then sorts only those.

## Endings

An ending is what turns the steps into an answer. `toList()` gives a list. `count()` gives how many items are left, as a `long`. `anyMatch(rule)` says whether any item fits, and stops at the first one that does. `findFirst()` gives the first item left, wrapped in an `Optional`, a box that may be empty, because there may be none: the next issue opens it.

When a chain has a wrong type somewhere, the error can run to many lines, and its words differ between Java versions. Look for the first line and the caret under it. A chain that gives numbers where you asked for text says something like `incompatible types: List<Integer> cannot be converted to List<String>`; with `collect`, something like `incompatible types: inference variable T has incompatible bounds`. Either way, read the chain from the start and say what each step hands on.

## Nothing runs until the end

The steps of a stream are a plan. Nothing runs until an ending asks for an answer, and then each item goes through every step in turn, one at a time:

```java
Stream<String> later = jars.stream()
    .filter(j -> j.grams() > 400)
    .map(j -> j.flavour());
```

That line weighs no jar at all. Ask for `later.limit(1).toList()`, and the jars are weighed one by one only until the first heavy one is found. A chain with no ending does nothing: no filter runs, no map runs. A step that must see every item first, such as `sorted`, reads the whole list before it hands anything on.

A stream is used once. Once its ending has run, it is finished, and using it again stops the program with `IllegalStateException: stream has already been operated upon or closed`. To ask a second question, start a new stream from the list. And a stream never changes the list it came from: `filter` and `sorted` make new streams, not new lists in place of the old.

Streams can also share their work out over several processors at once. That belongs with doing several things at once, a subject of its own that comes later.

## Your work in this issue

Open `HarbourOffice.java`. `main` is yours: take the `//` off a group of lines once what it uses is written. `Booking` is given above the tasks: use it as it is. Write each task under its own `// Task` comment. Each task asks for a stream, and Check hands over a list of its own that refuses to be read by a loop, `get`, `forEach` or a copy, so only a stream can read it. It reads the list afterwards, and for Task 3 it watches when your stream runs with a rule of its own. Run the file with `java HarbourOffice.java`.
