# Lists and maps that take a function

## What you will be able to do

You can hand a rule to a method now. The lists and maps you have used since part 6 have methods that take one too, and many of the loops you wrote there shrink to a line. By the end of this issue you will be able to:

- walk, clean and change a list in place with `forEach`, `removeIf`, `replaceAll` and `sort`
- count and add up in a map with `getOrDefault` and `merge`
- group things in a map of lists with `computeIfAbsent`
- say when a plain loop is still the clearer way

## The request from Ossian

> **Ossian:** The waiting list is a mess by the evening: blank lines, names with spaces, half of them typed without a capital, so they never sort right. And I want the seats booked on each boat added up, and the names on each boat together, for the harbour office.

All three tasks are in `QuayLists.java`.

## Lists that take a function

Four list methods take a function and do the walking for you. At the market:

```java
List<String> stalls = new ArrayList<>(List.of(" Plums", "", "figs ", "Apples"));
stalls.removeIf(s -> s.isBlank());
stalls.replaceAll(s -> s.trim());
stalls.sort((a, b) -> a.compareToIgnoreCase(b));
stalls.forEach(s -> System.out.println(s));
```

`removeIf` takes off every item its `Predicate` says yes to; `isBlank()` is true for a text that is empty or only spaces. `replaceAll` puts what its function gives in place of each item. `sort` takes a `Comparator`; `compareToIgnoreCase` compares two texts taking no notice of capitals, so `"figs"` comes after `"Apples"` and not after every capital. `forEach` hands each item to a `Consumer`, in order.

The first three change the list itself, so they work only on a list that can change: on a list made with `List.of` they throw `UnsupportedOperationException`. And they change the very list they are called on, the caller's own. That is what you want here, and it is why a method that must leave its caller's list alone copies it first.

A `String` never changes. `stalls.forEach(s -> s.trim())` runs, makes a trimmed copy of each text, and throws every copy away: the list is as it was. `replaceAll` is the one that puts the new text back.

`forEach` only walks. Change the list inside its own `forEach`, adding or removing, and Java stops it: `java.util.ConcurrentModificationException`, `at java.base/java.util.ArrayList.forEach`. The same rule as a for-each loop in part 6, and the same way out: `removeIf` takes items off safely.

## Maps that take a function

Counting in part 6 meant asking whether a key was there, then reading, adding and putting back. Maps have methods for each step:

```java
Map<String, Integer> jars = new HashMap<>();
jars.put("plum", jars.getOrDefault("plum", 0) + 12);
jars.merge("fig", 5, (old, more) -> old + more);
jars.merge("fig", 7, Integer::sum);
```

`getOrDefault` gives back the key's value, or the value you hand it when the key is missing, so a first jar never meets a `null`. `merge` puts the value for a missing key, and for a key that is there, puts what the function makes of the old value and the new one: after both lines `fig` holds 12. Hand `merge` a function that keeps only the new value and it writes over the old one, the very mistake it was meant to save you from.

For a map of lists, each key needs its own list, made the first time the key comes up:

```java
Map<String, List<String>> byStall = new HashMap<>();
byStall.computeIfAbsent("Sileas", k -> new ArrayList<>()).add("quince");
```

`computeIfAbsent` gives back the key's value, and when the key is missing first runs the function, puts what it made in the map and gives that back. It takes a function, not a list, because the list should be made only when it is needed. Handed a list itself, it is refused with something like `incompatible types: cannot infer type arguments for ArrayList<>`. And `map.forEach((key, value) -> ...)` walks a map, handing each key and value to a function of two parameters.

## When a loop is clearer

These methods are shorter when each step is one small rule. A loop is still the better choice when one walk does several things that depend on each other, when you need to stop early, or when the lambda would grow braces, three ifs and a counter. A lambda cannot change a local variable either, so a running total does not belong in `forEach`. Pick whichever a reader follows faster. Check judges what your methods do, not which tool did it.

## Your work in this issue

Open `QuayLists.java`. `main` is yours: take the `//` off a group of lines once what it uses is written. `Booking` is given above the tasks: use it as it is. Write each task under its own `// Task` comment. Check hands your methods lists of its own, reads the list `names` changed afterwards, and compares the maps you give back as maps, whatever order they keep. Run the file with `java QuayLists.java`.
