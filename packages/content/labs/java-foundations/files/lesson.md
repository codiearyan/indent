# Files: reading, writing and adding

## What you will be able to do

Every program so far forgot everything when it ended. A file keeps it. By the end of this issue you will be able to:

- name a file with a `Path`, and build a path from another one
- read a whole file with `Files`, and write one, or add to its end
- read a long file a line at a time with `Files.lines`, and close it
- handle the checked exceptions files throw, and say which character set a file is in

## The request from Bridie

> **Bridie:** The notices live in a file now, and so does the log I keep through the day. The old till writes its own file at closing, and when I open it the pound signs come out as a box with a question mark. I want the program to read them, add to the log without wiping it, and count how often the Linnet sails, however long the till's file gets.

All three tasks are in `HutFiles.java`. Its files sit beside it: `notices.txt`, `till.txt` and `log.txt`.

## Path names a file

A `Path`, from `java.nio.file`, names a file or a folder. `Path.of("stock.txt")` is relative: it means `stock.txt` in the folder the program runs in, here your workspace. A path is built from another with `resolve` and `resolveSibling`:

```java
Path market = Path.of("market");
Path stock = market.resolve("stock.txt");         // market/stock.txt
Path prices = stock.resolveSibling("prices.txt"); // market/prices.txt
```

Never glue a path together from text with `+` and a slash: the text of a path is for people to read, while `resolve` uses each system's separator and keeps the path on the file system it came from.

A path names a file whether or not it is there: `Files.exists(stock)` asks. Older code uses `java.io.File` for the same job; the `Files` methods replace it.

## Reading and writing with Files

`Files` does the work, a whole file at a time:

```java
List<String> jars = Files.readAllLines(stock);     // each line, without its line end
String all = Files.readString(stock);              // the whole file, line ends and all
Files.writeString(prices, "plum 2.35\n");          // replaces what prices held
Files.writeString(log, "sold out\n", StandardOpenOption.CREATE, StandardOpenOption.APPEND);
```

`writeString` replaces the file, or makes it. Hand it `StandardOpenOption.APPEND` and it adds to the end instead; `APPEND` alone throws a `NoSuchFileException` when the file is not there yet, so add `CREATE` to make it. `Files.write(prices, lines)` writes a list of lines, each ended the way the computer ends a line: on Windows `"\r\n"`. When a file's format says `"\n"`, build the text yourself.

`readAllLines` takes off every kind of line end, `"\n"`, `"\r\n"` and `"\r"`, and an empty file gives an empty list. `readString(...).split("\n")` does neither: on a file from Windows each line keeps a `"\r"` at its end.

## Files throw checked exceptions

A file can be missing or locked, whatever the code does. So every method of `Files` that touches the disk says it throws `IOException`, which is checked, as part 5 showed. A method that calls one without saying so is refused:

```
Stock.java:6: error: unreported exception IOException; must be caught or declared to be thrown
        return Files.readAllLines(file);
                                 ^
```

Add `throws IOException` to the method when the caller should decide what to do, as a reading method usually should; a missing file then reaches the caller as `java.nio.file.NoSuchFileException: stock.txt`. Catch it only where you can do something useful: an empty `catch`, or an empty list as if the file had no lines, hides a missing file from everyone. `throws Exception` compiles too, and tells the caller nothing about what to plan for.

## Character sets

A file holds bytes. A character set says which bytes mean which letters. In UTF-8, the usual one, plain letters take one byte and a `£` or an `à` take two. In ISO-8859-1, which older machines write, each takes one. Read a file in the wrong one and Java stops:

```
Exception in thread "main" java.nio.charset.MalformedInputException: Input length = 1
```

The `Files` methods read and write UTF-8 when no character set is named. Name it anyway, and name the other one where a file needs it: `Files.readAllLines(old, StandardCharsets.ISO_8859_1)`. The editor reads UTF-8, so a file in ISO-8859-1 shows its `£` as a box. So leave `till.txt` as it is in the editor: a change saved there writes the whole file back in UTF-8, boxes and all.

## Long files: Files.lines, and close it

`readAllLines` holds the whole file in memory. `Files.lines(stock, StandardCharsets.UTF_8)` gives a `Stream<String>` that reads it a line at a time, as the stream goes, so the file stays open until the stream is closed. Never closed, it stays open as long as the program runs. A `Stream` can be closed, so a try with resources, from part 5, closes it on every way out:

```java
try (Stream<String> lines = Files.lines(stock, StandardCharsets.UTF_8)) {
    long plums = lines.filter(line -> line.startsWith("plum")).count();
}
```

A reading mistake inside the stream comes out as an `UncheckedIOException`, with the real exception as its cause.

## Your work in this issue

Open `HutFiles.java`. `main` is yours: it reads and writes the files beside it, so take the `//` off a group of lines once what it uses is written, and run the file with `java HutFiles.java`. Write each class under its own `// Task` comment. Check hands each method a path to a file of its own, in a folder of its own, on a file system that refuses any path that leads out of that folder and counts files left open.
