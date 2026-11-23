# Pointers: the way to a repair

## What you will be able to do

A reference is a second name for a value that already exists, and it always refers to one. Sometimes the honest answer is "there is none": no repair has that ticket. A pointer is a variable that holds where a value is, its address, and it can also hold nothing at all. By the end of this issue you will be able to:

- take the address of a value with `&`, and keep it in a pointer
- reach the value with `*`, and a member of an object with `->`
- use `nullptr` for "points at nothing", and ask before you follow a pointer
- choose between a pointer parameter and a reference parameter
- read `const` on either side of the star

## The request from Dorrit

> **Dorrit:** When a customer rings about a ticket, I look it up on Kasimir's bench. I want the repair itself, not a copy, so the minutes I see are the real ones, and a plain "not here" when the ticket is not on the bench. Then I log the call's minutes on what I found, and it must not fall over when there was nothing. And people always ask which job has taken longest.

`Repair` is given whole at the top of `src/lookup.cpp`. All three tasks are functions below it.

## An address, and a pointer to keep it

```cpp
Lamp desk(40);
Lamp* chosen = &desk;
```

`&desk` is the address of `desk`: where it lives in memory. `Lamp*` reads "pointer to a Lamp", a type whose values are addresses of lamps. Here `&` and `*` sit in an expression and in a type: in a declaration, `Lamp*` makes a pointer and `Lamp&` a reference; in an expression, `&desk` takes an address and `*chosen` follows one.

`*chosen` is the lamp the pointer points at, the same `desk`, not a copy. To reach a member through a pointer, write `chosen->watts()`, which means `(*chosen).watts()`. A dot on the pointer itself is refused. Clang says something like `member reference type 'Lamp *' is a pointer; did you mean to use '->'?`, and GCC `request for member 'watts' in 'chosen', which is of pointer type 'Lamp*' (maybe you meant to use '->' ?)`. The other way round, `->` on a lamp that is not a pointer, is refused too. Watch out for `*chosen.watts()`: the dot is read before the star, so it fails the same way.

Forget the `*` and you have the address itself: printed, it shows a number like `0x16b0f2a8c`, and compared with a number, the compiler refuses it with something like `comparison between pointer and integer`. Moving a pointer along with `+` exists too; this repo does not need it.

## nullptr, and asking first

```cpp
Lamp* spare = nullptr;
if (spare != nullptr) {
    spare->switchOn();
}
```

`nullptr` is the pointer that points at nothing. Following it has no promised result; on most computers the system stops the program. So a function that may be handed `nullptr` asks first. A function that searches can give back `nullptr` for "not found", and its caller asks the same question.

A pointer into a vector follows the rule of the last issue: it is good only while the vector does not grow, and only if it points at the value where it sits. A loop written `for (Lamp lamp : shelf)` hands you a copy each round, so `&lamp` is the address of a local that ends with the round. `for (Lamp& lamp : shelf)` reaches each lamp itself.

## A pointer parameter or a reference

Take a reference, `Lamp&`, when there is always a lamp: the caller cannot pass "none", and the function needs no check. Take a pointer, `Lamp*`, when "none" is a real answer, and check for `nullptr`. Both let the function reach the caller's own value, so a change stays after the call.

## const on either side of the star

One rule: `const` applies to what is on its left, or, when nothing is, to what is on its right.

- `const Lamp* p` is a pointer to a lamp that must not change. `p` can move to another lamp; `p->switchOn()` is refused if `switchOn` is not a `const` function.
- `Lamp* const p` is a pointer that must not move, to a lamp that may change.

A vector taken as a `const` reference holds read-only lamps, so `&shelf[i]` is a `const Lamp*`. Putting it in a plain `Lamp*` is refused with something like `cannot initialize ... 'Lamp *' with ... 'const Lamp *'` (clang) or `invalid conversion from 'const Lamp*' to 'Lamp*'` (GCC): the promise not to change it cannot be dropped on the way.

## Your work in this issue

Write the three functions in order in `src/lookup.cpp`, and try each in `main`. Check builds each task with a `Repair` of its own that counts every time a repair is reached through `nullptr`. Build and run with `g++ -std=c++17 -Wall src/lookup.cpp -o lookup && ./lookup`.
