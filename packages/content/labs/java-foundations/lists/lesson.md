# Lists that grow

## What you will be able to do

Ossian's log is an array now, and it works because by evening the day's crossings are known. The waiting list at the hut is different. On a busy morning names join it all the time, and people leave it when a seat frees up or they give up and go home. An array cannot grow or shrink. A list can. By the end of this issue you will be able to:

- make an `ArrayList`, add to it, and read it with `get` and `size`
- remove from a list, and do it safely while walking through it
- walk a list or an array with the for-each loop
- say why a list of whole numbers is written `ArrayList<Integer>`, and read the errors lists bring

## The request from Bridie

> **Bridie:** When the Linnet is full I write the rest of the queue on the waiting list, and I need to call the last name when the next boat is in. Ossian wants the loads of the crossings that actually sailed, without the foggy ones at nought. And when someone cancels, every booking under their name has to go, not just the first.

All four tasks are in `WaitingList.java`.

## Making a list and adding to it

An `ArrayList` lives in a part of Java you bring in with a line at the top of the file, above the class: `import java.util.ArrayList;`. The starter has it already. The type in angle brackets says what the list holds:

```java
ArrayList<String> stalls = new ArrayList<>();
stalls.add("Cheese");
stalls.add("Bread");
stalls.add("Honey");
System.out.println(stalls);        // [Cheese, Bread, Honey]
```

It starts empty, and each `add` puts an item at its end. Printing a list shows its items in square brackets.

## Reading a list

A list is not an array, and it is read with methods, not with square brackets:

```java
stalls.size()          // 3, how many items it holds
stalls.get(0)          // "Cheese", the item at position 0
```

Positions start at 0, as everywhere in Java. `stalls[0]` is refused with `array required, but ArrayList<String> found`, and `stalls.length` with `cannot find symbol`: `length` belongs to arrays, `size()` to lists. Asking for a position the list does not have, like `stalls.get(3)` here, compiles and then stops the program:

```
Exception in thread "main" java.lang.IndexOutOfBoundsException: Index 3 out of bounds for length 3
```

An empty list has a size of 0 and no positions at all, so even `get(0)` stops it.

## The for-each loop

To look at every item in order, the for-each loop is the shortest way. Read it as "for each `String` called `stall` in `stalls`":

```java
for (String stall : stalls) {
    System.out.println("Stall: " + stall);
}
```

It works on arrays too: `for (int jars : shelf)` gives each `int` of an `int[]` in turn. It gives you the items but not their positions; when you need a position, use a `for` with a counter.

## Why a list of numbers says Integer

A list holds objects, and `int` is a plain value, not an object. So a list of whole numbers is written with `Integer`, the object form of an `int`:

```java
ArrayList<Integer> jars = new ArrayList<>();
jars.add(12);
int first = jars.get(0);
```

Java turns an `int` into an `Integer` as it goes into the list, and back as it comes out, so you can mostly forget the difference. `ArrayList<int>` is refused with `unexpected type`, `required: reference`, `found: int`. The same goes for `Double` and `Boolean`. One catch: on a list of `Integer`, `jars.remove(2)` removes the item at position 2, not the number 2.

## Removing, and the trap in it

`remove(i)` takes out the item at position `i`, and every item after it moves one place forward to close the gap. The list's size goes down by one.

That makes removing inside a loop tricky. Walk forward with a counter and remove the item at position 2, and the item that was at 3 is now at 2, but the counter moves on to 3: that item is never looked at. Remove inside a for-each loop and Java stops the program with a `ConcurrentModificationException`, because the list changed under the loop. Walking from the last position back to the first avoids both: the items that move are ones you have already looked at.

Last, a list handed to a method is the caller's own list, as with an array: the parameter is a copy of where the list lives, not a copy of the list. A method that removes from it changes the caller's list. Giving the parameter a new list changes only that copy.

## Your work in this issue

Open `WaitingList.java`. `main` holds today's queue and bookings, and it is yours to try things in: take the `//` off its lines as you write each method. Each method goes under its own `// Task` comment below `main`. Check calls your methods with lists and arrays of its own, empty ones included, so build on what each method is given.
