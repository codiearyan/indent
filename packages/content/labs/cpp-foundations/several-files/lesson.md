# A program in several files

## What you will be able to do

The last issue split the repair into a header and one `.cpp` file. A real program has more: each part of the work in a file of its own, all of them sharing the same types through the same header, and one place where the program starts. This issue builds such a program from three `.cpp` files. By the end of it you will be able to:

- build several `.cpp` files into one program, and say what the compiler and the linker each do
- read the linker's two errors, on a Mac and on Linux, and find what they point at
- say where `main` lives, and what happens when there are two
- use one struct from several files through one header

## The request from Ambrose

> **Ambrose:** My prices are mine. I want them written once, in a file of their own, so that when I change the rate it changes everywhere. Dorrit's words at the counter in another. And one program that brings it all together for the end of the day.

`src/repair.h` is written for you: the repair, and the declarations of the functions the other files write. The tasks are in `src/price.cpp`, `src/counter.cpp` and `src/main.cpp`.

## Two steps: compile, then link

```
g++ -std=c++17 -Wall src/main.cpp src/menu.cpp src/till.cpp -o cafe
```

This one command does two jobs. First the compiler reads each `.cpp` file on its own, with the headers it includes, and turns it into a piece of program. A call to a function from another file only needs its declaration at this step. Then the **linker** joins the pieces, and connects every call to the one body that answers it.

Every `.cpp` file of the program goes on the command. A header never does: the files that include it bring it in. Put a `.h` on the command and the compiler tries to prepare it as a piece of its own and stops; clang says "cannot specify -o when generating multiple output files". Take the header off the command.

## The linker's two errors

Leave a `.cpp` file out of the command, and every file still compiles, but the calls into the missing one have nowhere to go:

```
Undefined symbols for architecture arm64:          (a Mac; an older one says x86_64)
  "tillTotal(...)", referenced from: ...
undefined reference to `tillTotal(...)'            (Linux)
```

The same error comes when a body was never written, or when its first line differs from the declaration, a copy where the header says `const` reference. Read it for the function's name, then check three places: the declaration, the body, and the command.

The other error is a body found twice:

```
duplicate symbol 'menuPrice(...)' in: ...          (a Mac)
multiple definition of `menuPrice(...)'            (Linux)
```

That comes from a body written in a header, so every file that includes it has its own copy, or the same function written in two `.cpp` files. A linker error has no line number. It names a function, and the fix is in which file that function's body lives.

## Where main lives

A program starts at `main`, so it has exactly one. Here it lives in `main.cpp`, and the other files have none. Write a second `main` to try something out in `price.cpp`, and each file compiles, then the linker finds two: "duplicate symbol '_main'" on a Mac (the leading `_` is how a Mac names it inside), "multiple definition of `main'" on Linux. Try things from the one `main` instead.

## One struct, several files

`price.cpp` and `counter.cpp` both use `Repair`, and both include `repair.h`, so each file sees the struct once. That is allowed for a struct, though not for a function's body: a struct only describes a shape, and takes no place in the finished program, so every file may know it. What must not happen is two different `Repair`s, a copy pasted into one file and changed later. One header, included everywhere, keeps them the same.

## Your work in this issue

Write each function in the file its task names: `repairPrice` in `price.cpp`, `pickupLine` in `counter.cpp`, both exactly as `repair.h` declares them, and `dayTotal` in `main.cpp`. For the first two, Check builds a program of its own that includes `repair.h` and links it with your file. For `dayTotal`, it builds your `main.cpp` with its own `repairPrice` and `main`, so each task is judged on its own. Build and run all three with `g++ -std=c++17 -Wall src/main.cpp src/price.cpp src/counter.cpp -o counter && ./counter`.
