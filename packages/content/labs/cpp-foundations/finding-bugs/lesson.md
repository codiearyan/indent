# Find the bug

## What you will be able to do

The worst mistakes say nothing. No error, no crash, no hang: the program runs to the end and one number is wrong, for some inputs and not others. This last issue of the part is about hunting those down with what you already have, the editor and the terminal. By the end of it you will be able to:

- print what a program is doing to standard error, with names, without spoiling its output
- state with `assert` what must be true at a line, and know what an assert is not for
- cut a failing input down to the smallest one that still fails
- write an exception of your own that carries the value that was wrong

## The request from Dorrit

> **Dorrit:** The weekly report says the longest repair this week was 210 minutes. I know for a fact the ship clock took four hours. Nothing in the program complains. It has given the right answer for months, so it can't be wrong every week. Can you find out which weeks it gets wrong, and why?

The report is `src/report.cpp`. `longestOf` is given at the top, mistake and all. This week's minutes are in `main`.

## Prints that say what they are

A print that says only `240` is hard to read back among twenty others. Give every value a name and say where it was:

```cpp
std::cerr << "totalStock: i = " << i << ", count = " << count << "\n";
```

Send these to `std::cerr`, standard error, rather than `std::cout`. Both show in the terminal, but they are separate streams: whatever reads your program's real output, a file, another program or Check, reads standard output and leaves standard error alone. When the bug is found, take the prints out.

## assert: what must be true here

`#include <cassert>` brings in `assert`. It takes a condition that must be true at that line, and does nothing while it is:

```cpp
double averageCount(const std::vector<int>& counts) {
    assert(!counts.empty());
    ...
}
```

When the condition is false, the program stops right there and prints the file, the line and the condition, something like `Assertion failed: (!counts.empty()), function averageCount, file src/garden.cpp, line 12.` The wording differs between systems, but the line and the condition are always in it. A bug that would have shown up three functions later as a strange number is caught where it starts.

An assert states what **your own code** promises: "every caller checks the list first". It is not for checking what a person types. Shop builds often switch asserts off, by building with `-DNDEBUG`, and then the condition is not even looked at. A typing mistake would sail straight through. Input from outside is checked with an `if` and refused with `false` or a `throw`, as the last issues did.

For the same reason, an assert only looks. `assert(stock.erase("fern") == 1);` does its work only when asserts are on; with them off, the fern stays.

## Cutting the input down

When a program is wrong for a big input, find the smallest input that is still wrong. Take one value out and run it again. Still wrong: keep the cut. Right again: put the value back and try another. Stop when no single value can go. With three values instead of three hundred you can work through the code by hand, and the mistake usually stands out.

The smallest failing input is worth keeping too. It is exactly the case to try again after the fix.

## An exception that carries the value

`what()` gives a text. When the code that catches needs the wrong value itself, give it a class of its own, built on a standard kind:

```cpp
class BadShelf : public std::out_of_range {
private:
    int shelf;

public:
    explicit BadShelf(int wrong) : std::out_of_range("no shelf " + std::to_string(wrong)), shelf(wrong) {}
    int getShelf() const { return shelf; }
};
```

`: public std::out_of_range` after the name builds `BadShelf` on `std::out_of_range`: a `BadShelf` is a kind of `std::out_of_range`, with one more member. The constructor hands the message to `std::out_of_range` first, in its initialiser list, the way it gives a member its value. A `catch (const std::out_of_range&)` catches a `BadShelf` too, and `catch (const BadShelf& wrong)` can call `wrong.getShelf()`.

## Your work in this issue

Do the tasks of `src/report.cpp` in order: Task 1 is about `longestOf` as it is, so leave it alone. Build and run with `g++ -std=c++17 -Wall src/report.cpp -o report && ./report`, and add your prints to `std::cerr` as you go.
