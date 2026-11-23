# The standard algorithms

## What you will be able to do

You have written a total by hand, the largest by hand, and a search by hand, each a loop of a few lines with its own chance of a mistake. The standard library has these written already, tested by millions of programs, under names that say what they do. Reading `std::count(...)` tells you what a line does faster than reading its loop. By the end of this issue you will be able to:

- hand a vector to an algorithm with `begin()` and `end()`
- sort, reverse, search and count with `std::sort`, `std::reverse`, `std::find` and `std::count`
- add up with `std::accumulate` and find the largest with `std::max_element`
- say what each one gives back: nothing, a position, or a number

## The request from Ambrose

> **Ambrose:** End of the month. I want the total, the biggest bill, whether a ticket came back to us, how often, and the bills from the largest down. My nephew says the computer can sort. I'd like to see it.

All five tasks are in `src/ledger.cpp`, each a function above `main`.

## Handing over a vector: begin() and end()

An algorithm does not take a vector. It takes two places in it: where to start and where to stop. `cups.begin()` is the place of the first value. `cups.end()` is the place just past the last one, so the two together mean "all of it":

```cpp
std::sort(cups.begin(), cups.end());
```

These places are called **iterators**. In this issue you only need to pass them in and, sometimes, compare one with `end()`.

The algorithms come from two headers: `std::sort`, `std::reverse`, `std::find`, `std::count` and `std::max_element` from `#include <algorithm>`, and `std::accumulate` from `#include <numeric>`. Leave the line out and one compiler says something like "no member named 'accumulate' in namespace 'std'" or "'accumulate' is not a member of 'std'". Another may find the name through `<vector>` and build anyway, until the program meets a compiler that does not: always write the header the name comes from.

## Changing the order: sort and reverse

```cpp
std::vector<int> cups = {3, 1, 4};
std::sort(cups.begin(), cups.end());      // cups is now {1, 3, 4}
std::reverse(cups.begin(), cups.end());   // cups is now {4, 3, 1}
```

`std::sort` puts the values in order, smallest first, and `std::reverse` turns the order round. Both change the vector they are given and give back nothing. So neither works on a `const` vector. Try, and the compiler's errors come from inside the library's own files, often many of them, with words like "read-only" or "cannot assign". The line of yours that set them off is in a note marked "requested here" or "required from here". Read the notes for your own file's name. To get a sorted list without changing the caller's, copy it first, `std::vector<int> copy = cups;`, and sort the copy.

## Looking: find and count

```cpp
auto where = std::find(cups.begin(), cups.end(), 4);
if (where != cups.end()) { ... }          // 4 is in cups
int fours = std::count(cups.begin(), cups.end(), 4);
```

`std::find` gives back a **position**: the place of the first value equal to 4, or `end()` when there is none. It is not a number and not true or false, so compare it with `end()`. Used as a number, the compiler refuses it with an error about converting from a type whose name has something like `iter` in it. `auto` lets the compiler write that type for you.

`std::count` gives back a **number**: how many values are equal to 4.

## Adding up and the largest: accumulate and max_element

```cpp
int total = std::accumulate(cups.begin(), cups.end(), 0);
```

The third value is where the total starts, and it also sets the type the adding is done in. `0` is an `int`, so every step is worked out in whole numbers. For `double` values the fractions are lost at each step, quietly, with no warning. For prices, start from `0.0`.

```cpp
auto most = std::max_element(cups.begin(), cups.end());
std::cout << *most << "\n";               // the largest value
```

`std::max_element` gives back a **position** too: where the largest value is. A `*` in front reads the value at that place. On an empty vector the position it gives back is `end()`, where there is no value at all, so ask whether the vector is empty first.

## What comes back

Three kinds of answer, and the type tells you which: `std::sort` and `std::reverse` change the vector and give back nothing; `std::find` and `std::max_element` give back a position, to compare with `end()` or read with `*`; `std::count` and `std::accumulate` give back a number.

## Your work in this issue

Open `src/ledger.cpp`. Each task names the algorithm to use; Check looks for it, and calls your functions with lists of its own. Build and run with `g++ -std=c++17 -Wall src/ledger.cpp -o ledger && ./ledger`.
