# Your first program

## What you will be able to do

Tolliver Clockworks is a small workshop that repairs clocks and watches. Ambrose Tolliver runs it and prices every job, Kasimir repairs the clocks at the bench, and Dorrit takes them in at the counter. Every ticket, part and price is worked out by hand on paper slips, and they have hired you to move that work onto the workshop laptop. You have never written code, and that is fine: this issue starts at the very first step. By the end of it you will be able to:

- build a C++ program with the compiler and run it in the terminal
- make your program print lines of text
- turn a line off without deleting it
- leave notes in your code for the people who read it

This repo is for macOS and Linux, which come with a C++ compiler or can get one in a few minutes. Windows has none by default and its commands differ, so on Windows you need to set up a compiler yourself before you start.

## The request from Ambrose

Ambrose clears a corner of the bench for the laptop.

> **Ambrose:** Before you touch any of my tickets, show me this machine can talk. The card in the window should come from it: our welcome and the opening hours. And the old line about free cleaning has to go, but keep it somewhere. Kasimir says we might bring it back.

Everything here happens in one file, `src/welcome.cpp`.

## From text to a program

A C++ file is plain text. The computer cannot run text, so a program called the **compiler** reads your file and turns it into a program the computer can run. That step is called **building**. You build in the terminal, the panel below the editor:

```
g++ -std=c++17 -Wall src/welcome.cpp -o welcome
```

`g++` is the compiler. `-std=c++17` says which version of C++ the file is written in, `-Wall` asks it to warn you about anything that looks wrong, `src/welcome.cpp` is your file, and `-o welcome` names the program it makes. On a Mac, `g++` starts Apple's compiler, clang, and everything here works the same with it. When the build works, the compiler prints nothing at all. Then you run the program:

```
./welcome
```

The `./` means "the program in this folder". The two steps join with `&&`, which runs the second only when the first worked: `g++ -std=c++17 -Wall src/welcome.cpp -o welcome && ./welcome`. Build again after every change, or you run the old program.

## Inside main

Every program you write in this repo has the same frame:

```cpp
#include <iostream>

int main() {
    std::cout << "The kettle is on\n";
    return 0;
}
```

`#include <iostream>` brings in the part of the standard library that prints. `main` is where the program starts: it runs the lines between its curly braces from top to bottom, then stops. `return 0;` says it ended well.

The line in the middle prints. `std::cout` is the screen, and `<<` sends what follows to it. `std::` says that `cout` comes from the standard library; leave it off and the compiler does not know the name. Text sits between double quotes. Every statement ends with a semicolon, the way a sentence ends with a full stop.

## Lines of their own

`std::cout` prints exactly what you give it and nothing more. It does not start a new line by itself:

```cpp
std::cout << "Kettle on";
std::cout << "Tea poured";
```

prints `Kettle onTea poured`. The two characters `\n` inside the text mean "end the line here", so `"Kettle on\n"` prints the text and moves to a new line. You can also send `std::endl` after the text: `std::cout << "Kettle on" << std::endl;` does the same.

## When the compiler says no

Sooner or later the compiler will refuse your file. It prints an error instead of building, and the error helps you. It starts with the file, the line number and the word `error`:

```
src/tea.cpp:5:30: error: ...
```

Read it as: in `src/tea.cpp`, line 5, column 30, there is an error. After that, the compiler says in its own words what is wrong; for a missing semicolon, it says it expected one. Those words differ between compilers, but the file, the line and `error` are always there. One thing to know: the compiler reports where it _noticed_ the problem. A missing semicolon is often reported at the end of the line that lacks it, and sometimes on the line after. Look at that line and the one above.

The usual first-day causes are a missing semicolon, a missing quote, `std::` left off, or the `#include` line removed. A message that says a name is not declared, or not a member of `std`, points at the last two. Fix the first error, build again, and read again.

## Comments are notes for people

A comment is text the compiler skips. It starts with two slashes, and everything after them on that line is ignored:

```cpp
// The opening hours, for the sign on the door
std::cout << "Open from nine\n";
```

Comments have two everyday uses. The first is leaving a note for whoever reads the file next. The second is switching a line off: put `//` in front of a line of code, and the line stays in the file but is no longer part of the program, ready to come back by removing the slashes.

## Your work in this issue

Open `src/welcome.cpp`. The comments at the top list the four tasks, and each task has its own `// Task` section inside `main`. Build and run the program first to see what it prints today. Then work through the tasks in order, building and running after each change. When it looks right, press Check. Check builds your program with the same command and reads what it prints.
