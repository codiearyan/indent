# Packages: more than one file

## What you will be able to do

Every program so far lived in one file. The ticket code has grown past that: the fares, the tickets and the hut's own program belong apart, so each can be read and changed without the others, and so the hut cannot quietly work out fares of its own. Java keeps classes apart with files, folders and packages. By the end of this issue you will be able to:

- put one public class in each file, in folders that match its package
- use a class from another package with `import`
- say what `public`, `private` and no word at all allow, and use each on purpose
- build a folder of files with `javac -d` and run the main class by its full name

## The request from Bridie

> **Bridie:** The hut's program and the ticket code are all in one heap. I want the fares where only the ticket code can reach them, so nobody at the hut makes up a price, the tickets in their own place, and the hut's program on its own, printing the morning's tickets.

The three tasks are in three files: `lanternquay/tickets/Fares.java`, `lanternquay/tickets/Ticket.java` and `lanternquay/hut/Hut.java`.

## One public class per file

A file may hold several classes, as yours have, but at most one with `public` in front, and the file is named after it. You met the error in your first program: `class Tickets is public, should be declared in a file named Tickets.java`. Once classes are used from elsewhere, each important one gets its own file.

## Packages follow the folders

A package is a group of classes with a name, and the folders follow it: a class in the package `market.stalls` sits in the folder `market/stalls`. The first line of code in the file says so:

```java
package market.stalls;

public class Stall {
    ...
}
```

The class's full name is now `market.stalls.Stall`. Classes in the same package use each other by their short names, as before. If a package line does not match its folders, the trouble shows up elsewhere: the file that uses the class gets an error such as `cannot access Stall` with `file does not contain class market.stalls.Stall`.

## import

Code in another package could write the full name every time, `new market.stalls.Stall(...)`. An `import` line, after the package line and before the class, lets it use the short name:

```java
package market.square;

import market.stalls.Stall;

public class Square {
    ...
}
```

Leave the import out and the compiler says `cannot find symbol` with `symbol: class Stall`. Misspell the package in it and it says `package market.stall does not exist`.

## public, private and no word at all

The word in front of a class, a constructor, a method or a field says who may use it:

- `private`: only code in the same class.
- no word at all: code in the same package, and nothing outside it.
- `public`: code anywhere.

So far everything sat in one file in no package, and no word was enough. Across packages it is not: a class with no word cannot be used from another package, and neither can its constructor or methods without `public`. The compiler says, for example, `Stall is not public in market.stalls; cannot be accessed from outside package`.

That is a tool, not only a hurdle. A helper that only its own package should use gets no word on purpose, and then nothing outside can reach it. Give `public` to exactly what other packages need, and keep fields `private`.

## Building a folder and running it

With several files, compile them together with `javac`, naming every file. `-d out` says where the class files go:

```
javac -d out market/stalls/Stall.java market/square/Square.java
```

`javac` makes the folders inside `out` to match the packages, such as `out/market/square/Square.class`, and keeps them away from your source files. Then run the class that has `main` by its full name, with `-cp out` to say where the class files are:

```
java -cp out market.square.Square
```

If the name does not match a class in `out`, Java says `Error: Could not find or load main class market.square.Square`. Check that you built first, that the package line is right, and that you typed the full name with dots, not slashes. `java File.java` runs one file only, so it is not enough for a folder like this.

## Your work in this issue

Run every command from the top of your workspace, where the folder `lanternquay` is. Write `Fares.java` first, then `Ticket.java`, then `Hut.java`, each under its `// Task` comment, and build with the command the terminal suggests. Check builds your files as that command does, but judges each file on its own: beside your `Ticket` it puts a `Fares` of its own, and beside your `Hut` a `Ticket` of its own. Then it runs `lanternquay.hut.Hut` by name, as the second command does. No class file of Check's is left behind.
