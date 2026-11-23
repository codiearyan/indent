# Going through a vector

## What you will be able to do

A vector earns its keep when a program goes through it: every ticket, every price, every clock on the bench, however many there are today. You already know loops from the loops issue; here they meet lists. By the end of this issue you will be able to:

- go through every value of a vector with a range-based `for`
- choose between a copy of each value, `const auto&` and `auto&`
- write a counted loop over positions that is right on every compiler
- work out a total and the largest value by hand

## The request from Kasimir

> **Kasimir:** Every clock spends a day on the timing bench, and I write down how many seconds it gained. Minus when it lost. At the end of the day I add them up in my head, and I look for the one that runs fastest. Some days I miss one. The laptop wouldn't.

All four tasks are in `src/timing.cpp`, each a function above `main`.

## The range-based for

To do something with every value of a vector, in order, C++ has a loop that needs no position at all:

```cpp
std::vector<int> cups = {3, 1, 4};
for (int c : cups) {
    std::cout << c << "\n";
}
```

Read the round brackets as "for each `int c` in `cups`". The body runs once per value: `c` is 3, then 1, then 4. An empty vector runs the body zero times, so there is no special case to forget, and no position that can land past the end.

## A copy, const auto& or auto&

`int c` is a copy of each value. For a small value like an `int` or a `double`, that is fine. For a `std::string` it copies the whole text on every round, just as passing one to a function by value did. Three ways to write the loop variable, and what each does:

```cpp
for (std::string t : teas)          // a copy of each text
for (const auto& t : teas)          // the text itself, only read
for (auto& t : teas)                // the text itself, and it can change
```

`auto` lets the compiler write the type for you: it is the type of the values in the vector, here `std::string`. `const auto&` reads each value where it is, without copying it, and the compiler refuses a line that tries to change it. `auto&` is another name for each value in the vector, so a change to it is a change to the vector:

```cpp
for (auto& c : cups) {
    c = c * 2;                      // cups is now {6, 2, 8}
}
```

With `int c` or `auto c` instead, the loop doubles its copies and throws them away, and `cups` stays as it was. No error, no warning: the same trap as a function that changes a copy.

## A counted loop and the type of size()

Sometimes the position itself is needed, to number the lines for example. Then the loop counts positions, from 0 up to one less than the size:

```cpp
for (std::size_t i = 0; i < cups.size(); i++) {
    std::cout << i + 1 << ": " << cups[i] << "\n";
}
```

Two things in that first line are on purpose.

`i < cups.size()`, not `<=`. Positions run from 0 to `size() - 1`, so `<=` goes one step past the end, with everything the last issue said about that.

`std::size_t`, not `int`. `size()` gives back a `std::size_t`, a whole number that cannot be negative. Compare it with an `int` counter and one compiler warns under `-Wall`, with something like "comparison of integer expressions of different signedness", while the other says nothing. The program works either way, but a counter of the same type as `size()` is right on both. It comes with `<vector>`.

Because a `std::size_t` cannot go below 0, `cups.size() - 1` on an empty vector does not give -1. It wraps round to the largest number the type can hold, and a loop that runs up to it runs far past the end. Write `i < cups.size()` and an empty vector is simply no rounds.

## A total and the largest

Two loops come up again and again. A total starts at 0, before the loop, and grows by each value. The largest starts at a value that is really in the vector, and is replaced by any value larger than it:

```cpp
int most = cups[0];
for (int c : cups) {
    if (c > most) {
        most = c;
    }
}
```

Starting `most` at 0 looks harmless and is wrong the day every value is below 0: nothing beats 0, and the answer is a value the vector never had. Starting at `cups[0]` needs a vector that is not empty, so ask that first.

## Your work in this issue

Open `src/timing.cpp`. The tasks say which functions only read the drifts and which one changes them, and Check holds you to it with lists of its own, empty ones and ones where every clock loses time included. Build and run with `g++ -std=c++17 -Wall src/timing.cpp -o timing && ./timing`.
