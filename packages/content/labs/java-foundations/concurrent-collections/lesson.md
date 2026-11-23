# Collections for several threads

## What you will be able to do

When several threads use one list or map at once, the plain ones break, in the same quiet way the count did in the last issue. Java has collections made for that, and a short way to share out work that touches nothing shared. By the end of this issue you will be able to:

- count from many threads at once with a `ConcurrentHashMap`
- see why two calls in a row on a safe map are still not safe together
- give a reader a list that does not change under it
- share work over several threads with a parallel stream, and know when not to

## The request from Ossian

> **Ossian:** Both boats have a scanner at the gangway now, and every scan goes straight into the hut program. The counts per boat come out short. The board on the hut screen reads the departures while the office sends changes, and twice it fell over halfway down. And printing labels for the day's bookings takes an age, one after the other, while the computer has cores sitting idle.

All three tasks are in `QuayBoard.java`. Run it first: a plain `HashMap` filled by two threads counts short.

## Why a plain HashMap breaks

Adding to a `HashMap` rearranges its entries, and two threads adding at once can lose an add or leave the map broken for a later call. Two adds to an `ArrayList` at the same moment can write to the same place, or throw `ArrayIndexOutOfBoundsException`. These classes promise nothing when two threads use one at once, and most runs look fine.

## ConcurrentHashMap

A `ConcurrentHashMap`, from `java.util.concurrent`, is a map that any number of threads can use at once. Its type, as `Map` is for a `HashMap`, is `ConcurrentMap`:

```java
ConcurrentMap<String, Integer> jars = new ConcurrentHashMap<>();
```

Each call on it is safe by itself. Two calls in a row are not:

```java
Integer now = jars.getOrDefault("plum", 0);
jars.put("plum", now + 1);
```

Between the read and the put, another thread can read the same number. That is the lost update of the last issue, with a map in place of an `int`. The fix is a method that does the whole change in one call, which the map does with nobody in between. The issue on lists and maps that take a function showed it for counting:

```java
jars.merge("plum", 1, Integer::sum);
```

On a `ConcurrentHashMap` that one call reads, adds and writes in one step, and starts a key that is not there. `compute` does the same with a function of your own. A map made safe with locks, `Collections.synchronizedMap`, also exists; a `ConcurrentHashMap` lets many threads in at once and is the usual choice.

## Changed while another thread reads

Part 6 met `ConcurrentModificationException` when a loop removed from the list it went through. With threads it comes back, and no line of your loop changes the list:

```java
for (String jar : jars) {
    Thread helper = new Thread(() -> jars.add("rhubarb"));
    helper.start();
    helper.join();
    System.out.println(jar);
}
```

```
plum
Exception in thread "main" java.util.ConcurrentModificationException
	at java.base/java.util.ArrayList$Itr.checkForComodification(ArrayList.java:1095)
	at java.base/java.util.ArrayList$Itr.next(ArrayList.java:1049)
	at Cme.main(Cme.java:5)
```

The loop asks the list for its next item, sees that it changed since the loop began, and stops. Locks on every method do not cure it: a loop is many calls, and between them another thread can still add. There are two cures. Hand the reader a copy, taken while holding the lock, so the copy never changes. Or keep the items in a `CopyOnWriteArrayList`: every add makes a fresh copy inside, and a loop goes through the version it started with, whatever is added meanwhile. Adds cost more, so it suits a list read far more often than it is changed, such as a noticeboard.

## Parallel streams

Part 7 said that streams can share their work over several processors, and here it is. Ask a list for `parallelStream()` in place of `stream()`, and Java splits the list into parts and works on them on several threads at once, from a pool of its own:

```java
List<String> labels = jars.parallelStream()
    .map(jar -> printLabel(jar))
    .toList();
```

`map` and `toList` keep the order of the list, however the work was shared out, so the labels come back in the order of the jars. Two things break that. `forEach(labels::add)` on a parallel stream adds in the order the work happened to finish, and from several threads at once into one list, which is the plain `ArrayList` problem again. Let the stream collect what it makes, and change nothing outside it.

A parallel stream pays only for work that is slow and shares nothing: splitting ten numbers costs more than adding them up. Work that must happen in order, or changes one shared thing, is a job for one thread, which cannot lose an update.

## Your work in this issue

Open `QuayBoard.java`. `Labeller` is given above the tasks; use it as it is. `main` is yours: take the `//` off a group of lines once what it uses is written, and run the file with `java QuayBoard.java`. Check's map holds a thread that has read a count until the other thread has read it too, its board check posts while it reads, and its labeller makes the last label first, so each mistake shows every time.
