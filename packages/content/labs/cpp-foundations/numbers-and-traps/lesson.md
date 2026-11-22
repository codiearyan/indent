# Numbers and their traps

## What you will be able to do

Ambrose prices every repair at Tolliver Clockworks, on the back of a slip, with a pencil and a lot of crossing out. Now the laptop does sums for him. Computers are good at sums, but C++ has a few rules about numbers that surprise everyone once. This issue shows you those rules on purpose, so they do not surprise you on a bill. By the end of it you will be able to:

- do sums with `+`, `-`, `*`, `/` and `%`
- say when a division keeps its decimals and when it drops them
- spot a number that has grown too big for its type
- print a price with exactly two digits after the point

## The request from Ambrose

> **Ambrose:** I want the bill worked out by the machine, not by me. Labour at my rate, the screws Kasimir bags up, how long a job takes us on average, and the parts. And the guarantee: I print on every receipt how many times the watch will beat before it runs out. People like that. Last week the laptop said a negative number.

All five tasks are in `src/prices.cpp`.

## Sums

The operators work as you expect from school: `+` adds, `-` subtracts, `*` multiplies, `/` divides. Multiplying and dividing happen before adding and subtracting, and round brackets go first of all:

```cpp
int cups = 2 + 3 * 4;      // 14
int mugs = (2 + 3) * 4;    // 20
```

A sum can use variables, and its result can go into a new variable or be printed straight away.

## Whole numbers divide differently

When both numbers of a division are `int`s, the result is an `int` too. Whatever comes after the point is dropped, not rounded:

```cpp
int teabags = 17;
int perPot = 5;
int pots = teabags / perPot;    // 3, not 3.4
int spare = teabags % perPot;   // 2
```

Often that is exactly what you want: three full pots. The `%` operator gives the **remainder**, what is left after the whole-number division: two teabags.

When you want the decimals, this rule is a trap. Putting the result into a `double` does not help, because the division has already happened in whole numbers:

```cpp
double perCup = teabags / perPot;   // 3, the .4 is already gone
```

The type of a division is decided by the numbers being divided. If one of them is a `double`, the other is turned into a `double` too, and the decimals stay. To turn an `int` into a `double` on purpose, write `static_cast<double>(...)` around it:

```cpp
double perCup = static_cast<double>(teabags) / perPot;   // 3.4
```

The same goes the other way. A `double` put into an `int` loses its decimals without a word: `int price = 4.99;` holds 4. clang warns about a written-out number like that one, but with `-Wall` neither compiler warns when the value comes from a variable, so choose the type before you write the line.

## Numbers have a size

An `int` is not endless. It holds numbers from a little under minus two billion to a little over two billion. A sum that goes past the top does not stop with an error. On these computers it runs past the end and comes back round from the bottom, so a huge positive sum can come out negative. Strictly, C++ makes no promise at all about what happens, which is worse. That is where Ambrose's negative number came from.

For bigger numbers there is `long long`, which goes past nine billion billion. But it has the same trap one level up: a multiplication of `int`s is worked out in `int`, and only the result is put into the `long long`:

```cpp
int seconds = 2000000;
long long big = seconds * 5000;                           // wrong: worked out in int
long long right = static_cast<long long>(seconds) * 5000; // 10000000000
```

Turning the first number into a `long long` makes the whole multiplication happen in `long long`, from left to right.

## Printing prices

`std::cout` prints a `double` with as few digits as it needs, up to six in all. So `12.40` prints as `12.4`, and `20.0` as `20`. For money that looks wrong. Two tools fix it, and they live in the header `<iomanip>`, which needs its `#include` line at the top of the file:

```cpp
std::cout << std::fixed << std::setprecision(2) << 3.5 << "\n";   // 3.50
```

`std::fixed` says "always print the point and a set number of digits after it", and `std::setprecision(2)` sets that number. Without `std::fixed`, `setprecision(2)` means two digits in all, so 19.95 would print as 20. Once sent, both stay in force for everything `std::cout` prints after them.

## Your work in this issue

Open `src/prices.cpp`. Ambrose's figures for today are at the top of `main`, and Check tries other figures in them, so build on the names. Build and run with `g++ -std=c++17 -Wall src/prices.cpp -o prices && ./prices` after each task, and compare what it prints with the example in the task. When a number looks wrong, work it out by hand and ask which rule above it ran into.
