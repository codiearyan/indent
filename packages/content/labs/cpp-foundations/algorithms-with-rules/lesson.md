# The algorithms, handed a rule

## What you will be able to do

In part 3 the standard algorithms worked on plain values: `std::sort` put numbers smallest first, `std::find` looked for a value, `std::count` counted it. Real lists hold repairs, and "largest" or "the one I want" means something only you can say. With lambdas, you can say it. By the end of this issue you will be able to:

- hand `std::sort` a comparison, and keep the promise a comparison makes
- search, count and test a list with `std::find_if`, `std::count_if`, `std::any_of` and `std::all_of`
- build a new list with `std::transform`, and take items out with `std::remove_if` and `erase`
- write a function that takes a rule of its caller's, as the algorithms do

## The request from Kasimir

> **Kasimir:** The bench list is in whatever order the tickets came in. I want the long jobs first, so they start in the morning. And I want to ask it things: the first pocket watch, how many jobs run over half an hour, what each will cost, and to clear off the ones that are done.

His schedule is `src/schedule.cpp`, with the `Repair` struct of part 4 at the top.

## A rule handed to an algorithm

Each algorithm of this issue takes a function as its last value and calls it on the items. A garden centre with a list of plants:

```cpp
std::sort(plants.begin(), plants.end(),
          [](const Plant& a, const Plant& b) { return a.height > b.height; });
```

`std::sort` calls the lambda on pairs of plants, again and again, and moves them so that whenever it says `true`, `a` ends up before `b`: tallest first. The lambda is handed over, not called: no brackets after it. Write `byHeight()` where `byHeight` belongs and the lambda is called right there with nothing, and the compiler says something like `no matching function for call to object of type '(lambda ...)'`, or, from GCC, `no match for call to`.

## What a comparison promises

A comparison answers "does `a` go strictly before `b`?". `std::sort` relies on that answer being consistent: never `true` both ways round, and `false` for two equal items. `<=` and `>=` break it, because they say `true` for equals. With such a rule, a sort is not just wrong now and then: it may read past the end of the list or never finish, depending on the list.

When two items tie on the first rule, the order between them is left to chance, unless you give a second rule: compare heights, and only when the heights are equal, compare names.

## Asking the list

These take a lambda of one item, which gives back `true` or `false`:

```cpp
auto tall = [](const Plant& p) { return p.height > 100; };
auto first = std::find_if(plants.begin(), plants.end(), tall);
int many = std::count_if(plants.begin(), plants.end(), tall);
bool some = std::any_of(plants.begin(), plants.end(), tall);
bool every = std::all_of(plants.begin(), plants.end(), tall);
```

`std::find_if` gives back the place of the first match, or `end()` when there is none, and reading at `end()` reads something that is not there, as in part 3. Compare with `end()` first. A lambda that forgets its `return` gives back nothing, and the error lands inside the library's files, saying something like `value of type 'void' is not contextually convertible to 'bool'`; look for your line, marked `requested here` or `required from here`.

A lambda that needs a value of the function around it captures it, as last issue showed: `[limit](const Plant& p) { return p.height > limit; }`.

## Building and clearing

`std::transform` calls a lambda on each item and writes what comes back into another list, from a beginning you give it:

```cpp
std::vector<int> heights(plants.size());
std::transform(plants.begin(), plants.end(), heights.begin(),
               [](const Plant& p) { return p.height; });
```

It writes over places that already exist and never adds one. Hand it an empty vector and it writes where no place is: the program may stop, or quietly break something else.

`std::remove_if` is the surprise of the library. It cannot make a vector shorter; nothing given only places can. It moves every item that stays to the front, keeps their order, and gives back where they end. What is after that is left over, and the vector's own `erase` takes it off:

```cpp
auto kept = std::remove_if(plants.begin(), plants.end(), dead);
plants.erase(kept, plants.end());
```

Forget the `erase`, and the list keeps its old length, with leftovers at its end.

## A function that takes a rule

A lambda's type has no name you can write, so a function that takes one leaves its type open, as a function template:

```cpp
template <typename Test>
int countPlants(const std::vector<Plant>& plants, Test test) {
    return std::count_if(plants.begin(), plants.end(), test);
}
```

That is exactly how the algorithms themselves are written. The caller decides the rule; the function decides when to ask it, and asks only as often as it needs.

## Your work in this issue

Write the five tasks in `src/schedule.cpp`, each with the algorithm its task names, and try each on `bench` in `main`. Build and run with `g++ -std=c++17 -Wall src/schedule.cpp -o schedule && ./schedule`. Check calls your functions with lists of its own and, in Task 5, with rules of its own that count how often they are asked.
