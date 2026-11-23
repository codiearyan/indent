# Declarations and headers

## What you will be able to do

Every program so far was one file. That works until two programs need the same struct, or one file grows so long that nobody can find anything in it. C++ splits a program into files with two tools: a short file that says what exists, and the files that say how it works. By the end of this issue you will be able to:

- tell a declaration from a definition
- move a struct and the declarations of its functions into a header, with an include guard
- include your own header with quotes, and say why not angle brackets
- keep each function's body in one `.cpp` file, and read what the linker says when it is not

## The request from Ambrose

> **Ambrose:** Dorrit's counter and Kasimir's bench will both want the repair. Before anyone copies it, I want it in one place: what a repair is, and what can be done with one, in a short file anyone can read. The workings can live somewhere else.

The workshop's program is in `src/main.cpp`. In this issue the repair moves out of it, into `src/repair.h` and `src/repair.cpp`.

## Declaration and definition

```cpp
int cupsLeft(int made, int sold);                 // a declaration

int cupsLeft(int made, int sold) {                // a definition
    return made - sold;
}
```

A **declaration** is a function's first line with a semicolon: its name, what it takes and what it gives back. It is a promise that the function exists somewhere. A **definition** is the whole function, with its body. You have met this before: a function used above its definition needs a declaration above that line. The compiler only needs the promise to build a call. The body can be anywhere in the program, even in another file.

## A header

A **header** is a file of declarations, by custom ending in `.h`. A file that wants what it declares includes it:

```cpp
#include "cups.h"
```

`#include` pastes the header's text in, where the line stands. With double quotes, the compiler looks first in the folder of the file that includes it, which is where your own headers are. With angle brackets, `<cups.h>`, it looks only among its own headers, such as `<string>`, and does not find yours: clang says "'cups.h' file not found with <angled> include", GCC says "cups.h: No such file or directory".

A header holds the structs that several files need and the declarations of functions. It includes what it uses itself, `<string>` for a `std::string` member, so it builds whatever file includes it, in whatever order.

## The include guard

Headers include other headers, so one file can end up reading the same header twice. A function declared twice is fine, but a struct written twice is not: clang says "redefinition of 'Cup'", GCC "redefinition of 'struct Cup'". An **include guard** makes the second read empty:

```cpp
#ifndef CUPS_H
#define CUPS_H

// everything the header holds

#endif
```

The first time, `CUPS_H` is not yet defined, so the compiler reads on, and defines it. The second time it is, so the compiler skips to `#endif`. The name is your choice, usually the file's name in capitals, and it must be the same on both lines, or the guard guards nothing.

## Where the bodies go

A function's body goes in one `.cpp` file, which includes the header too, so the compiler checks the body against the declaration. Each `.cpp` file is compiled by itself, then the **linker** joins them into one program:

```
g++ -std=c++17 -Wall src/main.cpp src/cups.cpp -o cafe
```

This is why the body stays out of the header. Two `.cpp` files that include a header with a body each get their own copy, and the linker refuses to choose: "duplicate symbol" on a Mac, "multiple definition of" on Linux. The other way round, a declaration whose body is nowhere in the build compiles fine and stops at the linker: "Undefined symbols" on a Mac, "undefined reference to" on Linux, with the function's name. The same happens when the body's first line differs from the declaration, an `int` against a `double`: to the linker that is another function, and the declared one is missing.

A linker error has no line number, because it is about the program, not one line. Read it for the function's name, then find its declaration and its body.

## Your work in this issue

Open `src/repair.h`, `src/repair.cpp` and `src/main.cpp`. The tasks move the struct and `minutesText` out of `main.cpp`, then add one new function. Check builds a program of its own that includes `repair.h`, links it with your `repair.cpp`, and calls your functions, so `main.cpp` only has to lose what moved. Build and run with `g++ -std=c++17 -Wall src/main.cpp src/repair.cpp -o workshop && ./workshop`.
