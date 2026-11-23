# Lists with std::vector

## What you will be able to do

Every variable so far held one value. A day at the workshop is never one value: it is the tickets waiting at the bench, the prices of the week, the parts used this morning. Writing `ticket1`, `ticket2` and `ticket3` stops working the day a fourth ticket comes in. A **vector** is one variable that holds a list of values of the same type, and grows when you add to it. By the end of this issue you will be able to:

- make a vector, empty or with values in it, and add to its end
- ask a vector how many values it holds and whether it is empty
- read and change a value by its position
- say what happens at a position past the end, with `[]` and with `.at()`

## The request from Kasimir

> **Kasimir:** Dorrit pins every ticket on a strip by my bench, in the order they come in. I take the first, I add new ones at the end, and sometimes she swaps one for another. I tried a variable per ticket. On Tuesday there were eleven. I want one list that grows.

All four tasks are in `src/queue.cpp`, each a function above `main`.

## Making a vector

A vector comes from the standard library, so the file starts with `#include <vector>`. Its type says what it holds, in angle brackets:

```cpp
std::vector<int> cups = {3, 1, 4};
std::vector<std::string> teas;          // empty
```

`cups` holds three `int` values, in that order. `teas` holds `std::string` values and starts with none. A vector of one type holds only that type: an `int` vector cannot take a text.

`push_back` adds a value at the end, and the vector grows by one:

```cpp
teas.push_back("earl grey");
teas.push_back("green");                // teas is now {"earl grey", "green"}
```

Two questions every vector answers:

```cpp
std::cout << cups.size() << "\n";       // 3
if (teas.empty()) { ... }               // true when it holds nothing
```

`empty()` gives the same answer as `size() == 0` and says what you mean.

## Positions count from 0

Square brackets give the value at a position, as they did for a character of a text. The first value is at position 0, so the last is at `size() - 1`:

```cpp
int first = cups[0];                    // 3
int last = cups[cups.size() - 1];       // 4
cups[1] = 9;                            // cups is now {3, 9, 4}
```

The same brackets change a value: `cups[1] = 9` puts 9 where the 1 was. Nothing moves, and the size stays 3.

People count from 1. When someone says "the second cup", the position is 1. Turning one way of counting into the other is a `- 1` or a `+ 1`, and forgetting it is the most common mistake with lists.

## Past the end

`cups` has positions 0, 1 and 2. What does `cups[3]` give?

C++ makes no promise. `[]` does not check the position: it reads whatever is in memory where position 3 would be. The program may print a number that was never in the vector, it may be stopped by the system, and it may seem to work, which is the worst of the three, because the mistake waits for a day when it does not. An empty vector has no position at all, so even `cups[0]` is past its end. Changing a value past the end is worse still: it writes over memory that belongs to something else.

`.at()` reads the same values and checks the position first:

```cpp
std::cout << cups.at(1) << "\n";        // 9
std::cout << cups.at(3) << "\n";        // ends the program
```

At a position past the end, `.at()` ends the program with a message that says something like `out_of_range`. Each compiler words the rest its own way. Ending is better than a wrong number nobody notices, but a program that ends is still a program that failed: when a position might be past the end, ask before you use it. Check builds your code with the library's own guard switched on, which stops the program at a `[]` past the end, so there such a mistake is found on every run, not only on an unlucky day.

`size()` gives back a count of the type `std::size_t`: a whole number that cannot be negative. To compare it with a position held in an `int`, put the size in an `int` first, `int count = cups.size();`, and compare two `int` values. The next issue says more about this type.

## A vector in a function

A vector is passed to a function the way a `std::string` was in the references issue. A function that only reads it takes a `const std::vector<int>&`: no copy of the whole list is made, and the function cannot change it. A function that changes the caller's vector takes a `std::vector<int>&`, without `const`. Each task says which, and Check holds you to it: it passes a queue of its own and looks at it again after the call.

## Your work in this issue

Open `src/queue.cpp`. Write each function under its `// Task` comment, then call it from `main` with the queue that is there and print what it gives back. Build and run with `g++ -std=c++17 -Wall src/queue.cpp -o queue && ./queue`.
