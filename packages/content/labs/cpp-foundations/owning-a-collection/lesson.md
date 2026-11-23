# A class that owns its repairs

## What you will be able to do

Kasimir's bench is a list of repairs, and so far that list has been a plain `std::vector` that any line of the program could change. It can hold the same ticket twice, and nothing stops a slip of the hand from emptying it. A class can own the list, keep it private, and offer only the things a bench does: add, find, total, remove. By the end of this issue you will be able to:

- write a class that keeps a `std::vector` of objects behind its own functions
- hand out copies, so the class's rules cannot be got round from outside
- say why a copy of an object is a separate object
- work things out from the collection instead of keeping a second value that goes stale

## The request from Kasimir

> **Kasimir:** The bench list is a mess. Ticket 3101 is on it twice, and yesterday someone cleared it by accident. I want a bench that knows its repairs: one per ticket, found by ticket, the minutes added up, and taken off when they go home.

The class `Repair` is given whole in `src/bench.h`. Each task writes the first line of a function of `Bench` in `src/bench.h` and its body in `src/bench.cpp`.

## A class that owns a vector

```cpp
class Shelf {
private:
    std::vector<std::string> titles;

public:
    bool put(const std::string& title);
    std::vector<std::string> list() const;
};
```

`titles` is private, so the only way onto the shelf is `put`, and `put` can keep the shelf's rule: no title twice. It looks along the vector first, and when the title is there, it changes nothing and gives back `false`. The rule holds because no other line can reach the vector.

## Hand out copies

The rest of the program still needs to see what is on the shelf. `list` gives back a `std::vector<std::string>`: a copy. The caller can sort it, empty it or add to it, and the shelf's own vector stays as it was.

The trap is a function that gives back `std::vector<std::string>&`, a reference to the member itself. Then any line can push a second copy of a title, and the rule `put` keeps is gone, even though the member is private. A `const` reference, `const std::vector<std::string>&`, is safe: the caller can read the vector where it is and cannot change it. Inside a `const` function, the compiler refuses a plain reference, as you saw in the issue on `const`.

The same goes for one item. A function that gives back a `Repair` gives back a copy: change it, and the repair on the bench stays as it was. When the bench should change one of its repairs, that is a job for a function of the bench, which finds the repair and changes it where it is.

## A copy is an object of its own

```cpp
Shelf mine;
mine.put("Tides");
Shelf yours = mine;
yours.put("Orchards");
```

`yours` starts as a copy of `mine`, vector included, and from then on they are two shelves. Putting a book on `yours` leaves `mine` with one. C++ copies a class member by member, so a class whose members are values, numbers, texts and vectors of them, copies correctly without you writing anything. A `static` member would break this: it is one value for the whole class, so every shelf would share one list.

## Work it out from what you own

Say the shelf also had to count its pages. It could keep an `int pages` member and add to it in `put`. Then every function that changes the vector must remember to change `pages` too, and the day one forgets, the count is wrong and nothing says so. Working the count out from the vector each time it is asked cannot go stale. The vector is the one place the truth is kept.

Taking an item off is `erase`, with a position counted from the start:

```cpp
titles.erase(titles.begin() + i);
```

Everything after position `i` moves up one place, so the order is kept. Stop right after the erase: the positions behind it have moved.

## Your work in this issue

Task 1 gives the bench its vector, `add` and `all`. For Tasks 2 to 4, Check builds the bench with a vector, an `add` and an `all` of its own, written as Task 1 asks, so each task is judged on its own. Check also builds with the library's guard, so a read past the end of a vector stops the program. Build and run with `g++ -std=c++17 -Wall src/main.cpp src/bench.cpp -o bench && ./bench`.
