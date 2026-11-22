# Read the compiler

## What you will be able to do

You have met the compiler a few times now, mostly when it said no. This issue is about reading what it says, all of it, calmly, until it becomes the most useful thing on the screen. By the end of it you will be able to:

- read an error part by part: where, what kind, and what it is about
- fix the first error first, and know why the others can wait
- tell an error from a warning, and know when a warning matters
- tell the compiler's errors from the linker's

## The request from Kasimir

Kasimir has been reading a book about C++ in the evenings.

> **Kasimir:** I wrote my own bench sheet from the book. Springs, hands, the crystal, the oil. I typed it all in, ran the command, and it printed half a page at me. I don't want it rewritten, I want it working. The lines are what I meant. Can you find what's wrong with them?

His bench sheet is `src/workbench.cpp`. Each task is one of his lines that the compiler refuses.

## The parts of a message

Here is an error from a tea shop's file, as the compiler on a Mac prints it:

```
src/tea.cpp:9:20: error: use of undeclared identifier 'potsLeft'
    9 |     std::cout << potsLeft << "\n";
      |                  ^
```

Read it in pieces. `src/tea.cpp` is the file. `9` is the line and `20` the column, counted from the left. `error` is how serious it is. After that comes what the compiler found, in its own words. Below it, the compiler shows the line itself and puts a `^` under the spot it means.

The first part, file, line and `error`, looks the same on every C++ compiler. The words after it do not: GCC, the usual compiler on Linux, words the same problem differently, though it names `potsLeft` in quotes too. So do not learn the sentences by heart. Learn to find three things in them: the line, the kind of problem, and the name or symbol the message mentions in quotes.

## The first error first

One mistake can lead to many messages. A missing semicolon can make the compiler misread the next line too, and it reports that as well. So start at the top. Fix the first error, build again, and read again. Often half the list is gone.

Remember also that the line in the message is where the compiler _noticed_ the problem, not always where it is. A missing semicolon at the end of line 8 can be reported on line 8 or on line 9, depending on the compiler. When the line it names looks fine, look at the line above.

## Four kinds you will meet often

- **Expected a semicolon.** The message says the compiler expected a `;`. The statement before it is not finished.
- **A name it does not know.** The message says a name is not declared, and shows the name in quotes. Look for a typo, a capital letter, a missing `std::`, or a variable used above the line that makes it.
- **A value that does not fit.** The message names two types and says one cannot be converted to the other, or cannot initialize it. Compare the type of the box with the kind of value you put in it.
- **Not a member of std.** The name is right but the file never brought it in. Each part of the standard library lives in a header, and the `#include` line for that header goes at the top of the file. A name's reference page says which header it needs.

That last one comes with a new friend. `std::setprecision(2)` sets how many digits to print, and with `std::fixed` before it, that means two digits after the point: `std::cout << std::fixed << std::setprecision(2) << 3.5` prints `3.50`. Both are explained properly in the next issue, where you price repairs.

## Errors and warnings

An error stops the build: no program is made. A **warning** does not. The program is built, but the compiler thinks something looks wrong. That is what `-Wall` is for: it switches on the warnings worth hearing. In the last issue, the warning about a variable used before it had a value was a real bug. Read warnings as carefully as errors, and leave none behind.

## The compiler and the linker

Building is really two steps. The compiler turns your file into machine code. Then the **linker** puts that code together with the parts of the standard library it uses, and makes the program. Usually you never notice the second step. When it fails, the message looks different. Try it: rename `main` to `mian` in any program and build it. Every line compiles, and then the linker complains that `main` is missing. On Linux it says `undefined reference` and names `main`; on a Mac it says `Undefined symbols` and names `_main`. There is no line number, because the problem is not on a line: a piece the program needs is not there. Rename it back.

So when you read a message, ask first who is talking. A file and a line: the compiler, look at that line. "Undefined" and no line: the linker, look for something that is used but never made.

## Your work in this issue

Open `src/workbench.cpp` and build it with `g++ -std=c++17 -Wall src/workbench.cpp -o workbench`. You will see four errors, one under each task. For each, find its line, read what kind of problem it is, and fix only that: Kasimir's lines say what he meant. Build again after every fix. When the program builds, run it with `./workbench` and read the bench sheet.
