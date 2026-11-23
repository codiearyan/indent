# Building it properly: the day book

## What you will be able to do

This is the last issue of the repo. Its program uses most of what came before: a struct and a class, a vector, a file, an algorithm with a rule, and several files joined by headers. The new part is how it is built: one step per file, the way real programs are built, and a script that runs the steps for you. By the end of this issue you will be able to:

- compile each `.cpp` file on its own into an object file, and link them
- say which files must be built again when one changes, a header included
- turn the compiler's warnings up, and build without any
- read and finish a short build script

## The request from Kasimir

> **Kasimir:** The day book is five files now. Every time I change one line, I type the whole long command again, and last week I left a file off it and got a screen of errors. I want one thing to run that builds it right, every time.

The day book reads `data/day.csv` into a `DayBook` and writes a summary. `repair.h`, `repair.cpp`, `daybook.h` and `main.cpp` are given. You write two member functions in `daybook.cpp`, the summary in `report.h` and `report.cpp`, and the build steps in `build.sh`.

## Two steps, done apart

Part 4 built a program with one command, which compiled every file and linked them in one go. The two steps can be run apart. `-c` tells the compiler to stop after compiling, and gives one **object file** for one `.cpp` file:

```
g++ -std=c++17 -Wall -Wextra -c src/menu.cpp -o build/menu.o
g++ -std=c++17 -Wall -Wextra -c src/main.cpp -o build/main.o
g++ build/menu.o build/main.o -o cafe
```

An object file is the compiled code of one file, with holes where it calls into the others. The last line links: it fills those holes and writes the program. It reads no code, so the flags that say how code is read, `-std=c++17` and the warnings, belong on the compile lines. Leave an object file off the link line and the linker says what part 4 showed: something like `Undefined symbols` or `undefined reference to`.

## What is built again

The point of building apart is that a change costs only what it touches. Change `menu.cpp`, and only `menu.o` is compiled again, then the program linked again. In a program of hundreds of files, that is the difference between seconds and many minutes.

A header is different. It is pasted into every file that includes it, so change `menu.h` and every `.cpp` that includes it must be compiled again, and so must every one that includes a header which includes it. Forget one, and the program is linked from old and new pieces that disagree about a struct or a function, and it misbehaves in ways no message explains. When in doubt, build everything, which is what this issue's script does.

Large projects use build tools that know which file includes which and run only the steps a change needs. Underneath, they run these same two steps.

## Warnings turned up

`-Wall` turns on the warnings almost everyone wants. `-Wextra` adds more: a parameter a function never uses, or a whole number below zero compared with a size, which is never below zero. A warning is not an error: the program builds. It is the compiler pointing at a line that is likely not what you meant. Treat each one as a bug, and build without any.

## A build script

A shell script is a file of terminal commands, run in order, top to bottom, with `sh build.sh`:

```sh
set -e                    # stop at the first step that fails
cd "$(dirname "$0")"      # move to the folder this script is in
FLAGS="-std=c++17 -Wall"  # a variable
g++ $FLAGS -c src/menu.cpp -o build/menu.o
```

`set -e` matters: without it, a failed compile goes on to the link, which joins an old object file. The `cd` line makes the paths work from wherever the script is run, so they are written from the script's folder. `$FLAGS` is replaced by its value, split into words; inside double quotes it would stay one word.

## Your work in this issue

Write Tasks 1 and 2 in `src/daybook.cpp`, Task 3 in `src/report.h` and `src/report.cpp`, and Task 4 in `build.sh`. Then try them in `main.cpp`, and build and run with `sh build.sh && ./daybook`. Check compiles each of your `.cpp` files on its own and links it with a program of its own; it reads `build.sh` without running it.

## Where you are now

You started with one line that printed text. You can now write a program of several files with classes that keep their rules, read and write its data on disk, refuse what is wrong in plain words, and build it step by step without a warning. The projects and bug hunts in the app are where to use that next: bigger programs to build, and broken ones to fix.
