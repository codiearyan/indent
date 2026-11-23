# Shared owners: std::shared_ptr

## What you will be able to do

A `std::unique_ptr` gives every object exactly one owner. Some things really do belong to several places at once, and nobody knows in advance which one will let go last. `std::shared_ptr` is the owner for that: many of them share one object and keep a count, and the object ends when the last one goes. By the end of this issue you will be able to:

- make a shared object with `std::make_shared`, and share it by copying the `shared_ptr`
- read the count of owners, and say when the object ends
- say what `std::weak_ptr` is for
- choose between a value, a reference, a `unique_ptr` and a `shared_ptr`

## The request from Dorrit

> **Dorrit:** A clock that waits for a part is on Kasimir's bench and on my waiting list at the same time. When the part comes, I take it off my list; when the clock goes home, Kasimir takes it off his. Sometimes I am first, sometimes he is. The repair should end only when neither of us holds it any more.

`Repair` is given whole at the top of `src/lists.cpp`, with a destructor that prints a line, and `#include <memory>` is there.

## Owners that share a count

```cpp
std::shared_ptr<Lamp> lamp = std::make_shared<Lamp>(60);
std::shared_ptr<Lamp> spare = lamp;
```

`std::make_shared<Lamp>(60)` makes one lamp and its first owner. Copying the `shared_ptr` makes a second owner of the same lamp; the lamp is not copied. Both reach it with `->`, and `lamp.get() == spare.get()` is true. Each `shared_ptr` that owns the lamp adds one to a count they all share; `lamp.use_count()` reads it, here 2.

When an owner ends, or is erased from a vector, or is given `reset()`, the count goes down by one. When it reaches 0, the last owner deletes the lamp. So nobody writes `delete`, and nobody needs to know who lets go last. Deleting the object by hand, through `.get()`, ends it while the owners still count it, and they end it a second time later.

## A count belongs to the first shared_ptr

The count is made together with the first `shared_ptr` of an object. Two `shared_ptr`s made apart from one plain pointer each start a count of their own, each believes it is the only owner, and both delete the object:

```cpp
Lamp* raw = new Lamp(60);
std::shared_ptr<Lamp> a(raw);
std::shared_ptr<Lamp> b(raw);
```

That builds without a word, and ends the lamp twice. Make the object once with `std::make_shared`, and copy that `shared_ptr` wherever it has to go.

Every copy counts, even short-lived ones. A function that takes a `std::vector<std::shared_ptr<Lamp>>` by value copies every owner in it; a loop written `for (std::shared_ptr<Lamp> lamp : shelf)` adds an owner each round. Read with `const std::shared_ptr<Lamp>&`, and the count shows only the real owners. The count also changes whenever anyone copies or lets go, so read it when you need it rather than keeping an old number.

## When two objects hold each other

If a lamp held a `shared_ptr` to its socket and the socket held one back to the lamp, each would keep the other's count above 0 for ever: neither would ever end, even when the rest of the program has let go of both. `std::weak_ptr` breaks such a circle. It points at an object owned by `shared_ptr`s without counting as an owner, and before using the object you ask it with `lock()` for a `shared_ptr`, which is empty if the object has already ended. One side of a pair holds a `shared_ptr`, the other a `weak_ptr`.

## Which one to choose

- A **value**, `Lamp`, when the thing belongs to one place and is cheap enough to copy or move: most variables and members.
- A **reference** or a plain pointer when a function only needs to look at or change something that someone else owns, for as long as the call lasts.
- A **`std::unique_ptr`** when one owner must make the object live on its own, outside any block, and hand it on.
- A **`std::shared_ptr`** only when several places truly share it and any of them may let go last. It costs a count kept up to date on every copy, and it hides who owns what, so it is the last choice, not the first.

## Your work in this issue

Write the three functions in `src/lists.cpp` and try them in `main`: put a repair on both lists, read its count, let go of it one list at a time, and see when the destructor's line appears. Check builds each task with a `Repair` of its own that counts every repair made and ended. Build and run with `g++ -std=c++17 -Wall src/lists.cpp -o lists && ./lists`.
