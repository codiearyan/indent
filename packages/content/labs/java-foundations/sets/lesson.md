# Sets: each one only once

## What you will be able to do

Some questions are not "how many" or "which position" but "have we seen this before?". Has this ticket been scanned already? Was this passenger here yesterday too? A list can answer, by looking at every item, and it keeps repeats you never wanted. A set holds each thing once and answers at once. By the end of this issue you will be able to:

- use a `HashSet` to ask "have we seen it?"
- say which order a `HashSet`, a `LinkedHashSet` and a `TreeSet` keep
- find what two groups share with `retainAll`, without spoiling either
- keep a set of records of your own, and say why it finds equal ones

## The request from Bridie

> **Bridie:** A copied ticket got on twice last week, and nobody noticed. I want the gangway to list every ticket scanned a second time, in the order it happened. And I want to know who came both Saturday and Sunday, and which seats on a boat are still free.

All three tasks are in `Gangway.java`.

## A set holds each thing once

`Set` is an interface, like `List` and `Map`, and `HashSet` is the class you will use most:

```java
Set<String> flavours = new HashSet<>();
flavours.add("rhubarb");      // true: it was not there
flavours.add("plum");         // true
flavours.add("rhubarb");      // false: already there, nothing changes
flavours.contains("plum")     // true
flavours.size()               // 2
```

`add` gives back whether the set changed, so one call both adds a thing and tells you whether you had seen it before. `contains` is quick however big the set grows, where a list's `contains` looks at every item. A set has no positions, so there is no `get(0)`: walk it with a for-each loop.

## Three orders

A `HashSet` finds things by their hash codes, and it walks them in an order that comes from those codes. Add rhubarb, plum and fig, and printing the set shows `[plum, rhubarb, fig]`. That order is not promised, follows no rule you can count on, and can change when the set grows. Comparing a `HashSet`'s printed form with a list, or taking its "first" item, is a bug that waits.

When order matters, pick the set that keeps it:

- a `LinkedHashSet` keeps the order things went in: `[rhubarb, plum, fig]`
- a `TreeSet` keeps them sorted, text in alphabetical order and numbers smallest first: `[fig, plum, rhubarb]`

All three are a `Set`, so a method can give back a `Set<String>` and choose inside which kind it makes. A `TreeSet` needs things with a natural order. Text and numbers have one; an object of a class with none stops the program with `java.lang.ClassCastException: class Jar cannot be cast to class java.lang.Comparable`. The next issue gives your own classes an order.

## What two sets share

`a.retainAll(b)` keeps in `a` only what is also in `b`, and takes everything else out of `a`. That is what two groups share, but it changes `a` itself, and `a` may be the caller's set, or one made with `Set.of` that cannot change at all. So make a copy first, of the kind whose order you want:

```java
Set<String> both = new TreeSet<>(monday);
both.retainAll(tuesday);
```

`both` holds the flavours sold on both days, in alphabetical order, and `monday` is as it was. `addAll` is the other way round: everything in either.

## A set of your own records

A `HashSet` finds a thing the way a `HashMap` finds a key: by its hash code first, then `equals`. A class of your own with neither is found only when you hand over the very same object, never one made again from the same values. One with `equals` and no `hashCode` is no better: the set looks only among objects whose hash codes match, and Object's `hashCode` differs from one object to the next, so an equal one is never even compared.

A record writes both from its parts:

```java
record Pitch(String row, int number) {
}

Set<Pitch> taken = new HashSet<>();
taken.add(new Pitch("B", 4));
taken.contains(new Pitch("B", 4))     // true
```

## Your work in this issue

Open `Gangway.java`. `main` is yours: take the `//` off a group of lines once what it uses is written. Write each task under its own `// Task` comment. Check makes its codes and names separately, as ones read in would be, picks values so that a `HashSet`'s order differs from the order each task asks for, and reads the sets it handed in afterwards. Run the file with `java Gangway.java`.
