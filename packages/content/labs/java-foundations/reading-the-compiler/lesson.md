# Reading the compiler

## What you will be able to do

The clipboard has retired, and the ticket hut runs on your programs. Ossian was so taken with them that he sat up last night and wrote one of his own, a log of the day for the boat. It does not work, and he would like to know why before Bridie finds out. Every programmer spends a good part of each day reading what the compiler and the program say back. By the end of this issue you will be able to:

- compile a program with `javac` and run it with `java`, as two separate steps
- tell an error the compiler gives from one that stops a program while it runs
- read the three compiler errors beginners meet most, and fix what each one points at
- read a stack trace to find the line a program stopped on

## The request from Ossian

> **Ossian:** I copied the bits that looked right from your programs and typed in the rest. The computer printed a pile of complaints with little arrows in them. I fixed one and two new ones turned up. Then it ran for a moment and printed something about an exception. Can you make it write my log?

All four tasks are in `Logbook.java`, and each is one of Ossian's mistakes.

## Two steps: javac, then java

So far you ran a program with `java Notice.java`, one command that does two things. They can be done one at a time:

```
javac Orchard.java
java Orchard
```

`javac` is the compiler. It reads `Orchard.java`, checks every line, and if every line passes it writes a new file, `Orchard.class`, which holds the program in a form the computer can run. It prints nothing when all is well. `java Orchard`, with the class name and no `.java`, runs that class file.

If `javac` refuses the file, it writes no new class file. A `java Orchard` after that runs the last version that did compile, which can be very confusing. So compile, read what `javac` says, and run only when it said nothing.

## Compile errors and errors at run time

The two steps fail in different ways. A compile error comes from `javac`, before anything runs. It starts with the file name, the line number and `error:`:

```
Orchard.java:9: error: cannot find symbol
```

An error at run time comes from a program that compiled and started. It prints everything up to the line that failed, then an exception and a stack trace:

```
Exception in thread "main" java.lang.ArithmeticException: / by zero
	at Orchard.main(Orchard.java:14)
```

Its first line says what went wrong; the line starting with `at` says where, with the file and line number in brackets. The compiler cannot catch this kind of mistake, because it depends on the values: dividing by `trees` is fine on most days and fails the day `trees` is 0.

## The three errors you will meet most

**cannot find symbol.** The compiler met a name that nobody made. The lines under the error say which:

```
Orchard.java:9: error: cannot find symbol
        int left = apples - eaten;
                            ^
  symbol:   variable eaten
  location: class Orchard
```

Look for a spelling slip, a capital letter, or a variable used before the line that makes it. Do not make a new variable with the wrong name just to quiet the error: the program would compile and quietly use the wrong value.

**incompatible types.** A value of one type is put where another type is needed, and the message names both: `incompatible types: String cannot be converted to int` means a `String` went into an `int`. Decide which of the two is wrong for what the variable holds, and change that one.

**variable might not have been initialized.** The compiler follows every way through your code. If one of them reaches a line that uses a variable before any line gave it a value, it refuses. With an `if` and no `else`, the way where the condition is false is the one that was forgotten.

## One error at a time

Read errors from the top and fix the first one first: a single slip can cause several errors further down. Then compile again.

Do not be surprised when new errors turn up after you fix some. `javac` checks a file in rounds. It looks for names and types first, and only when those are all right does it follow every way through the code, which is where `might not have been initialized` comes from. Fewer errors on the screen does not always mean fewer mistakes, but each round gets you closer.

## Your work in this issue

Open `Logbook.java` and run `javac Logbook.java`. Each task is one of Ossian's mistakes, under its own `// Task` comment, and the comment says what the lines were meant to do. Fix each one so the lines do exactly that, without deleting them. When `javac` prints nothing, run `java Logbook` and read what it says. Check judges each task on its own lines, so a task you have not fixed yet never turns another one red, but `javac` refuses the whole file until every mistake is gone.
