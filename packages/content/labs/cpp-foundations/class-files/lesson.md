# A class in two files

## What you will be able to do

The repair is a class now, and it lives in `main.cpp`, where no other file can use it. In the headers issue you moved a struct and its functions into a header and a `.cpp` file. A class splits the same way, with one new piece of spelling for the functions that belong to it. By the end of this issue you will be able to:

- say what part of a class goes in the header, and what goes in the `.cpp` file
- write member functions and a constructor outside the class, with the class's name and `::` in front
- read the errors when that name is missing, or when a first line differs from the class's
- build a program whose files share one class

## The request from Ambrose

> **Ambrose:** The repair class is good, and it is stuck in `main.cpp`. My prices need it, and so will the counter. Put it where every file can reach it, the way we did with the struct.

Task 1 is in `src/repair.h`, Task 2 in `src/repair.cpp` and Task 3 in `src/main.cpp`.

## The header holds the class

Every file that makes or uses a timer needs to know what a `Timer` is: its members, so it knows its size, and its functions, so it can call them. So the whole class goes in the header, private members included, with only the first line of each function:

```cpp
// timer.h
#ifndef TIMER_H
#define TIMER_H

#include <string>

class Timer {
public:
    Timer(const std::string& name, int seconds);
    int getSeconds() const;
    void tick();

private:
    std::string name;
    int seconds;
};

#endif
```

The include guard and the header's own `#include` lines work as before. Private does not mean hidden from view: anyone can read the header. It means no code outside the class can use those members.

## The .cpp file holds the bodies

```cpp
// timer.cpp
#include "timer.h"

Timer::Timer(const std::string& name, int seconds) : name(name), seconds(seconds) {}

int Timer::getSeconds() const {
    return seconds;
}

void Timer::tick() {
    if (seconds > 0) {
        seconds -= 1;
    }
}
```

`Timer::` in front of each name says which class the function belongs to. Inside it, the members are in reach by name, as they were inside the class. The constructor is `Timer::Timer`, and its member initialiser list travels with its body, not with the line in the header. In a list, `name(name)` is allowed: the outer `name` can only be a member, the inner one is the parameter.

Each first line must match the class's line exactly, `const` at the end included. If it differs, clang says "out-of-line definition of 'getSeconds' does not match any declaration in 'Timer'" and GCC "no declaration matches 'int Timer::getSeconds()'". Compare the two lines side by side.

## When Timer:: is missing

Write `int getSeconds() const` without `Timer::`, and it is a new function, outside any class. Clang refuses the `const`, since only a member function can have one. Without the `const`, the trouble is the members: in `void tick()` the name `seconds` means nothing, so you get "use of undeclared identifier 'seconds'" from clang, or "'seconds' was not declared in this scope" from GCC. And when such a function uses no member at all, every file compiles and the linker stops, because the member the class declared has no body: "Undefined symbols" with "Timer::tick()" on a Mac, "undefined reference to `Timer::tick()'" on Linux.

## Inside the class, or in the .cpp?

A body written inside the class, as `main.cpp` has it, is allowed in a header: every file that includes it may have it, as with a struct. Short getters often stay there. But the class's line and a second body in the `.cpp` file is one body too many: both compilers say "redefinition of" and the function's name. In this issue every body moves to `repair.cpp`, so the header shows the class at a glance and a change to a body rebuilds one file.

Build every `.cpp` file into one program, as before: `g++ -std=c++17 -Wall src/main.cpp src/repair.cpp -o workshop`.

## Your work in this issue

Task 1 moves the class into `repair.h`, inside a guard, with only first lines. Task 2 writes every body in `repair.cpp`, which includes `repair.h`. Task 3 writes `benchLine` in `main.cpp`, which uses the class only through its public functions. Check builds Task 1 with bodies of its own, Task 2 with a header of its own, and Task 3 with a header of its own, so each task is judged on its own. Build and run with `g++ -std=c++17 -Wall src/main.cpp src/repair.cpp -o workshop && ./workshop`.
