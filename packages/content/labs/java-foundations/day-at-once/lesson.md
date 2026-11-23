# The whole day, checked at once

## What you will be able to do

This last issue uses nearly all of the repo: files become records, money adds up to the penny, a bad file is reported while the rest are kept, and the work is shared over a small pool of threads. By the end of this issue you will be able to:

- write a job as a value, which reads nothing until a pool runs it
- gather the answers of many futures, the failed ones included
- read several files at once with a pool of a fixed size, and shut it down
- explain why the total cannot lose an update, though the files were read at once

## The request from Ossian

> **Ossian:** Each boat has its own till now, the Linnet, the Gannet and the relief boat, and each writes its own file at closing. The harbour office wants the day's takings from all of them before the last bus. The old program read them one after another, and when the relief boat's till died halfway through a line, it stopped and sent nothing at all.

All three tasks are in `HarbourCheck.java`, and the till files are beside it. `Sailing` and `Sailings` are given: `Sailings.read` turns one till file into a list of sailings, as the data file issue did, and throws an `IllegalArgumentException` naming the line it could not read.

## A job is a value

Part 7 showed that a rule can be a value, a lambda kept in a variable and run later. A job for a pool is exactly that: a `Callable` that does nothing until someone calls it.

```java
static Callable<Integer> weighing(Path shelf) {
    return () -> {
        int grams = 0;
        for (Jar jar : Jars.read(shelf)) {
            grams += jar.grams();
        }
        return grams;
    };
}
```

`weighing(shelf)` reads nothing: it gives back the job, and the reading happens when a pool's thread calls it. Read the file before the `return`, and give back a lambda that only hands over the answer, and every file is read on the thread that made the jobs, one after another, before any pool sees them. A `Callable` may throw a checked exception, so `IOException` needs no catch inside it: whoever calls the job, through a future, gets it.

## Gathering the answers

Each job's answer comes back through its future. Keep the futures in a map under a name a person knows, so that a failure can say which file it was. A `LinkedHashMap` keeps the order you put things in. A path has parts, and `file.getFileName()` is the last part, `linnet.csv`, whatever folder it is in; `toString()` on the path gives the whole of it.

`main` makes two futures by hand to try this with: `CompletableFuture.completedFuture(amount)` is a future that already holds its answer, and `CompletableFuture.failedFuture(exception)` one whose job threw.

Then go through the map once, on one thread: `get` each answer, add it to the total, and catch an `ExecutionException` around that one `get`, noting the file's name and the cause's message, as the executor issue did for bookings. A future whose job has not finished is no reason to skip it: `get` waits for it.

## Why no update is lost

Can the total come up short, as the count did when two windows sold at once? Not here: nothing is shared while the threads work. Each job adds up its own file in a variable of its own and gives that amount back, and the amounts are added up afterwards, on one thread. No two threads ever touch the total.

Compare the way that goes wrong: each job adding its file's takings straight into one `BigDecimal` field. A `BigDecimal` never changes, so `total = total.add(mine)` reads the field, makes a new amount and writes the field: three steps, and two threads meeting in the middle lose one of them. Give each thread its own result and gather them on one thread, and there is nothing to guard.

## The whole program

Closing time puts the pieces together: a pool from the executor issue, a job per till, the gathering, and a `finally` from part 5 so that the pool's threads end however the gathering went. A broken till costs only its own takings and a line in the report. Each piece comes from a part of this repo, from classes and records to money, files and threads.

## Your work in this issue

Open `HarbourCheck.java`. `Sailing` and `Sailings` are given above the tasks; use them as they are. `main` is yours: take the `//` off a group of lines once what it uses is written, and run the file with `java HarbourCheck.java`. Check runs every task beside a `Sailings` of its own, which reads no disk and holds each read until your method is waiting for an answer, and Task 3 beside its own right `Jobs` and `Results`.

You can now write a Java program that reads real files, works with real money and dates, refuses what cannot be, and shares its work over several threads without losing any of it. The projects and bug hunts in the app, in its other languages, are where the same habits go next: a larger program to build from the first file, or code that is written and wrong, where your job is to find out why.
