# One owner: std::unique_ptr

## What you will be able to do

Last issue every `new` needed exactly one `delete`, at the right time, on every path through the code, and the compiler could not help you with any of it. The standard library has a pointer that does the deleting itself: `std::unique_ptr`, the one owner of its object. By the end of this issue you will be able to:

- make an owned object with `std::make_unique`, and know when it ends
- hand ownership on with `std::move`, and read the error when you copy instead
- write a function that takes ownership, and one that only borrows
- keep a vector of owners

## The request from Ambrose

> **Ambrose:** When a repair is finished it leaves Kasimir's bench and comes to my desk for its bill. Last week one repair was billed twice and another vanished: two lists both thought they had it, or neither did. I want every repair in exactly one place, and gone from memory when the last place lets go of it.

`Repair` is given whole at the top of `src/desk.cpp`, with a destructor that prints a line. `#include <memory>` brings in the smart pointers.

## An owner that deletes

```cpp
std::unique_ptr<Lamp> lamp = std::make_unique<Lamp>(60);
lamp->switchOn();
```

`std::make_unique<Lamp>(60)` makes a lamp with `new` and gives back a `std::unique_ptr<Lamp>` that owns it. You reach the lamp with `->` and `*`, as with a plain pointer. When `lamp` ends, at its closing brace, it deletes its lamp; on every path, early `return`s included. No `delete` appears in your code at all.

A unique_ptr can be empty: one made with no lamp, or one whose lamp went elsewhere. Compare it with `nullptr` to ask. The compiler never turns a plain pointer into one by itself: `std::unique_ptr<Lamp> lamp = new Lamp(60);` is refused, so that no owner appears by accident.

## One owner means no copies

A copy would make two owners, and two owners would delete the lamp twice. So a unique_ptr cannot be copied, and the compiler says so in one of its longest messages. Somewhere in it is the line that matters, something like:

```
error: call to implicitly-deleted copy constructor of 'std::unique_ptr<Lamp>'
```

from clang, or `use of deleted function 'std::unique_ptr<...>::unique_ptr(const std::unique_ptr<...>&)'` from GCC. "Deleted" there means the copy is forbidden on purpose. When `push_back` causes it, the error points into the library's own files; the line of yours is the one marked "requested here" or "required from here".

To hand the lamp to a new owner, move the owner:

```cpp
std::vector<std::unique_ptr<Lamp>> shelf;
shelf.push_back(std::move(lamp));
```

`std::move(lamp)` lets the vector take the ownership, and `lamp` is empty afterwards. The lamp itself stays exactly where it is in memory; only who owns it changes. Using `lamp->` after the move follows an empty pointer, which has no promised result. A function that gives back a local unique_ptr by name moves it out by itself.

## Taking and borrowing

A function that takes `std::unique_ptr<Lamp>` by value becomes the owner: the caller must write `std::move`, so the hand-over is plain to see at the call. Taking `std::unique_ptr<Lamp>&` instead hides that: the caller still owns the lamp, or does not, after the call.

A function that only needs to look should not own at all. It takes a `Lamp&` or a `const Lamp&` when there is always a lamp, or a plain `Lamp*` when there may be none. `lamp.get()` gives the plain address without giving up ownership. A borrowed pointer is good only while its owner lives: keep `.get()` beyond that, and it leads to a lamp that has ended.

Two more ways to break the rule: `release()` makes the unique_ptr let go of its lamp without deleting it, and the lamp leaks unless someone else deletes it; and handing the same `new` to two unique_ptrs gives two owners again.

## A vector of owners

A `std::vector<std::unique_ptr<Lamp>>` owns every lamp on it. When the vector ends, or a place is erased, the lamp in that place ends too. So taking a lamp off for good is two steps in this order: move the owner out of its place, which leaves the place empty, then erase the place. Loop over such a vector with `const std::unique_ptr<Lamp>&`; a loop variable without the `&` would be a copy.

## Your work in this issue

Write the four functions in `src/desk.cpp` and try them in `main`: watch the destructor's lines appear without a single `delete`. Check builds each task with a `Repair` of its own that counts every repair made and ended. Your own build counts nothing, so a run that seems to work proves nothing. Build and run with `g++ -std=c++17 -Wall src/desk.cpp -o desk && ./desk`.
