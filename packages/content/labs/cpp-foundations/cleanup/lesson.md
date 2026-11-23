# Cleanup whatever happens

## What you will be able to do

An exception skips every line between the `throw` and the `catch` that takes it. Last issue that was the point. This issue is about the lines it skips that should have run: a `delete`, a tool put back, a count set right. By the end of it you will be able to:

- say what ends, and what does not, as an exception leaves a function
- see why a `delete` after a line that can throw is a leak waiting to happen
- give everything an owner on the line that makes it, so it ends by itself
- write a small guard class whose destructor puts something back, and know why its constructor must throw before it takes anything

## The request from Kasimir

> **Kasimir:** When a part doesn't fit, the fitting stops, fine. But afterwards the program has repairs in memory nobody can reach, and the loupe is gone from the drawer for the rest of the day. The parts that don't fit are not the problem. What's left lying around after them is.

The fitting bench is `src/fitting.cpp`. `Repair` and `fitPart` are given at the top; `fitPart` throws `std::runtime_error` when a part does not fit.

## What ends as an exception leaves

When an exception leaves a function, every local variable of that function ends, in reverse order, and each one's destructor runs, exactly as at the closing `}`. The same happens in every function the exception passes through on its way to a `catch`. A `std::string` gives back its text, a `std::vector` its values, a `std::unique_ptr` deletes what it owns.

What does not end is anything made with `new` that only a plain pointer holds. The pointer is a local and ends; what it points at does not:

```cpp
Plant* plant = new Plant("fern");
repot(*plant);      // may throw
delete plant;       // skipped when it does
```

When `repot` throws, the `delete` is one of the lines the exception skips. The fern stays in memory, and once the function is gone nothing knows its address. Putting the `delete` in a `catch (...)` that deletes and throws again does work, but it is easy to get wrong, and every new line that can throw needs the same care.

## An owner on the line that makes it

The way out is part 6's rule, applied from the first line: whatever is made is owned at once, by something that ends by itself.

```cpp
std::unique_ptr<Plant> plant = std::make_unique<Plant>("fern");
repot(*plant);      // may throw: plant ends, and deletes the fern
return plant;
```

Now every way out of the function is covered: the `return`, and the exception. Better still, when nothing has to outlive the function, a plain local `Plant fern("fern");` needs no `new` at all.

## A guard of your own

The same idea works for anything that must be put back, not only memory. A small class takes something in its constructor and puts it back in its destructor. Because it is a local, its destructor runs on every way out, exceptions included:

```cpp
class Lent {
private:
    std::vector<std::string>& shelf;
    std::string book;

public:
    Lent(std::vector<std::string>& from, const std::string& title) : shelf(from), book(title) {
        // take the book off the shelf here
    }
    ~Lent() { shelf.push_back(book); }

    Lent(const Lent&) = delete;
    Lent& operator=(const Lent&) = delete;
};
```

A member that is a reference, like `shelf`, refers to the caller's own shelf and gets it in the initialiser list. The two lines with `= delete` forbid copies, the way `std::unique_ptr` does: a copy would put the book back a second time when it ends. With them, a line that copies a `Lent` gets the long "deleted" error you met in part 6.

Use it as a named local, for as long as you need the book: `Lent held(shelf, "Clockwork");`. A `Lent` made without a name, `Lent(shelf, "Clockwork");`, ends at the end of its own line, and one made with `new` never ends at all.

## Two rules for the guard

**A constructor that throws leaves no object.** When the constructor cannot take what it needs, it throws, and then no `Lent` exists, so no destructor ever runs for it. That is right, as long as the constructor throws before it has taken anything. A constructor that takes the book and then throws has taken something that nothing will ever put back.

**A destructor never lets an exception out.** If an exception leaves a destructor, or a second one is thrown while the first is still on its way out, the language does not try to choose: it ends the program with `terminate`, whatever `catch` is waiting. Destructors are taken to promise this: they are `noexcept` without saying so. A destructor puts things back quietly.

## Your work in this issue

Mend the first task, then write the class and the function in `src/fitting.cpp`. Check builds each task with a `Repair` of its own that counts every repair made and ended, and with a `fitPart` of its own that throws for parts it chooses. Build and run with `g++ -std=c++17 -Wall src/fitting.cpp -o fitting && ./fitting`, and watch which repairs end.
