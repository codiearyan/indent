# Gathering up, and Optional for no answer

## What you will be able to do

A stream so far ended in a list, a count or a yes. The answers people ask for are often something else: a total, an average, a map of groups, one line of text. And sometimes there is no answer at all, which is where a `null` used to creep in. By the end of this issue you will be able to:

- add up, average and find the largest with `mapToInt`, `sum`, `average` and `max`
- gather a stream into a map of groups with `Collectors.groupingBy` and `counting`, and into text with `joining`
- give back an `Optional` when there may be no answer, and use one with `isPresent`, `orElse` and `map`
- say why `get` on an empty `Optional` is the old `null` mistake again

## The request from Ossian

> **Ossian:** The council wants the season in numbers: seats sold, seats per booking on average, the biggest party. Bookings per boat. And the names in one line for the notice. Last year the report said the biggest party on the Curlew was null. The Curlew never ran.

All three tasks are in `SeasonReport.java`.

## Streams of numbers

A stream of jars has no `sum`: what would it add up? `mapToInt` turns each item into a plain `int` and gives an `IntStream`, which has the endings numbers need:

```java
int total = jars.stream().mapToInt(j -> j.grams()).sum();
OptionalDouble average = jars.stream().mapToInt(j -> j.grams()).average();
OptionalInt heaviest = jars.stream().mapToInt(j -> j.grams()).max();
```

Calling `sum()` on the stream of jars itself is refused with `cannot find symbol` and `symbol: method sum()`. The sum of no jars is 0. But no jars have no average and no heaviest, so those two come back as an `OptionalDouble` and an `OptionalInt`: boxes that hold the answer, or are empty. `average.orElse(0)` gives the average, or 0 for an empty box.

`average()` keeps the fraction. `total / jars.size()` would not: 1070 grams over three jars is 356 in whole numbers, not 356.67. And with no jars at all, that division by 0 stops the program.

## Gathering into a map, or a line

`collect` is the ending that gathers a stream into something, and `Collectors` makes the somethings:

```java
Map<String, List<Jar>> byStall = jars.stream().collect(Collectors.groupingBy(j -> j.stall()));
Map<String, Long> perStall = jars.stream().collect(Collectors.groupingBy(j -> j.stall(), Collectors.counting()));
String line = jars.stream().map(j -> j.flavour()).collect(Collectors.joining(" / "));
```

`groupingBy` makes a map from each key its function gives to a list of the items with that key. Hand it a second collector, and each group becomes what that collector makes: `counting()` gives how many, as a `long`, so the map's values are `Long`. Keep it in a `Map<String, Integer>` and the line is refused with something like `incompatible types: inference variable D has incompatible equality constraints Integer,Long`.

The map `groupingBy` makes keeps its keys in no promised order, like a `HashMap` in part 6: never read it as if it kept the order things came in. `joining` puts its text between two items only, never at the ends: `plum / fig / quince`.

## Optional: an answer that may be none

`findFirst`, `max` and `min` may have nothing to give, so they give back an `Optional`:

```java
Optional<Jar> big = jars.stream().filter(j -> j.grams() > 1000).findFirst();
```

`big.isPresent()` says whether a jar is in it. `big.orElse(other)` gives the jar, or `other` when it is empty. `big.map(j -> j.flavour())` turns what is in it into something else and stays empty when it is empty, so `big.map(j -> j.flavour()).orElse("none")` reads as what it means.

`big.get()` takes the jar out, and on an empty one stops the program with `java.util.NoSuchElementException: No value present`. That is the old `null` mistake again, in a new coat: using an answer without asking whether there is one. The point of an `Optional` is that you cannot forget to ask. So a method that may find nothing gives back an empty `Optional` with `Optional.empty()`, never `null`, and a value that may be missing goes in with `Optional.ofNullable(x)`; `Optional.of(null)` throws a `NullPointerException` at once.

## Your work in this issue

Open `SeasonReport.java`. `main` is yours: take the `//` off a group of lines once what it uses is written. `Booking` is given above the tasks: use it as it is. Write each task under its own `// Task` comment. Tasks 1 and 2 ask for streams, and Check hands them a list that only a stream can read. It compares maps as maps, whatever order they keep, and reads every `Optional` you give back as a value. Run the file with `java SeasonReport.java`.
