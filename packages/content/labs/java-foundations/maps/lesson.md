# Maps: find it by its name

## What you will be able to do

A list answers "what is at position 3". Most questions at the hut are not like that: how many tickets did the Gannet sell, what does the island crossing cost, how many seats are booked on the Linnet at nine. Each of those looks something up by a name. A map keeps values under keys and finds one straight away. By the end of this issue you will be able to:

- put values in a `HashMap` under keys, and get them back
- say what `get` gives for a key that is not there, and deal with it
- count things with a map, and walk through a map's keys and entries
- keep keys in order with a `TreeMap`, and say why a key needs `equals` and `hashCode`

## The request from Ossian

> **Ossian:** Every evening I count the tickets by hand: so many for the Gannet, so many for the Linnet. I want the program to count them, and to print the tally in the order of the boats' names, so it reads the same every night. And Bridie wants to ask how many seats are left on any sailing.

All three tasks are in `Tally.java`.

## Keys and values

A `Map<K, V>` holds pairs: each key of type `K` has one value of type `V`. Prices at a fruit stall:

```java
Map<String, Integer> pence = new HashMap<>();
pence.put("rhubarb", 300);
pence.put("plum", 400);
pence.put("fig", 520);
pence.get("plum")             // 400
pence.containsKey("fig")      // true
pence.size()                  // 3
```

`Map` is the interface and `HashMap` one class that implements it, as with `List` and `ArrayList`. A key is there once at most: `put` with a key already in the map gives it a new value in place of the old one, and gives back the old one. Values may repeat.

## A key that is not there

`get` with a key the map does not have gives back `null`. With a `Map<String, Integer>`, storing that in an `int` stops the program, because `null` cannot become a number:

```java
int quince = pence.get("quince");
```

```
Exception in thread "main" java.lang.NullPointerException: Cannot invoke "java.lang.Integer.intValue()" because the return value of "java.util.Map.get(Object)" is null
	at Prices.main(Prices.java:11)
```

Read it as "Java tried to turn an `Integer` into an `int`, and what `get` gave back was null". There are two ways to deal with a key that may be missing. Ask first, with `containsKey`, or let the map give a value of your own for a missing key: `pence.getOrDefault("quince", 0)` gives 0. `containsValue` is a different question: it looks among the values, not the keys.

## Counting with a map

Counting is the commonest use of a map. To count the jars sold by flavour, read the count so far and put back one more:

```java
Map<String, Integer> sold = new HashMap<>();
for (String flavour : sales) {
    if (sold.containsKey(flavour)) {
        sold.put(flavour, sold.get(flavour) + 1);
    } else {
        sold.put(flavour, 1);
    }
}
```

The first jar of a flavour has no count yet, so it starts at 1, not 0. `put(flavour, 1)` on every jar would write over the count each time, and `sold.get(flavour) + 1` without the check would meet the `null` above on the first jar.

## Walking a map, and keeping it in order

`keySet()` gives the keys, and `entrySet()` gives the pairs, each a `Map.Entry` with `getKey()` and `getValue()`:

```java
for (Map.Entry<String, Integer> entry : pence.entrySet()) {
    System.out.println(entry.getKey() + " costs " + entry.getValue());
}
```

In what order? A `HashMap` promises none. Printing `pence` above shows `{plum=400, rhubarb=300, fig=520}`: not the order they went in, and not alphabetical. It comes from the keys' hash codes and can change when the map grows. Never write code that leans on it.

When order matters, choose a map that keeps one. A `TreeMap` keeps its keys sorted, text in alphabetical order and numbers smallest first, and `new TreeMap<>(pence)` makes a sorted copy of any map: printing it shows `{fig=520, plum=400, rhubarb=300}`. A `LinkedHashMap` keeps the order the keys went in.

## A key needs equals and hashCode

A `HashMap` finds a key the way a `HashSet` does, as part 4 showed: by its hash code first, then `equals`. Text and numbers have both. A key of your own needs both too, or a key made again from the same values is never found:

```java
Map<Pitch, String> holders = new HashMap<>();
holders.put(new Pitch("B", 4), "Marsaili");
holders.get(new Pitch("B", 4))          // null, if Pitch has no equals and hashCode
```

A record writes `equals` and `hashCode` from all its parts, so a record makes a good key with nothing more to write.

## Your work in this issue

Open `Tally.java`. `main` is yours: take the `//` off a group of lines once what it uses is written. Write each task under its own `// Task` comment. Check counts with tickets of its own, hands Task 2 maps that keep their keys in different orders, and looks sailings up with new `Sailing` objects it makes itself. Run the file with `java Tally.java`.
