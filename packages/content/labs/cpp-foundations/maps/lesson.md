# Looking things up with std::map

## What you will be able to do

A vector finds a value by its position: the third ticket, the last price. Kasimir never thinks of his parts that way. He asks for crowns, or mainsprings, by name. A **map** keeps values under names of your choosing, called **keys**, and finds a value by its key. By the end of this issue you will be able to:

- make a map, add to it and read from it by key
- say why `[]` on a map can add an entry, and when that matters
- ask whether a key is there with `count` or `find`
- go through a map in the order of its keys, and count things with one

## The request from Kasimir

> **Kasimir:** The drawers have labels: crowns, mainsprings, jewels. I want to say "three more crowns" and have the count follow, ask "any jewels?" without the laptop inventing a jewel drawer, and see the whole stock in order. And at night, how many of each part I used.

All four tasks are in `src/stock.cpp`, each a function above `main`.

## Making a map

A map comes from `#include <map>`. Its type names two types: the key's, then the value's.

```cpp
std::map<std::string, int> teaTins = {{"earl grey", 4}, {"green", 1}};
```

Each key appears once. Square brackets with a key give the value under it, and change it:

```cpp
std::cout << teaTins["green"] << "\n";   // 1
teaTins["green"] = 6;                     // green now has 6
teaTins["oolong"] = 2;                    // a new key, with 2
```

Writing to a key that is not there yet adds it. `teaTins.size()` counts the keys, and `teaTins.empty()` asks whether there are none, as for a vector.

## [] adds what it does not find

Here is the surprise. Reading with `[]` adds the key too:

```cpp
std::cout << teaTins["rooibos"] << "\n";  // prints 0
std::cout << teaTins.size() << "\n";      // one more than before
```

`teaTins["rooibos"]` looks for the key, does not find it, puts it in with a value of 0, and gives back that 0. The answer looks right, and the map now has a rooibos tin nobody ever bought. That is why `[]` cannot be used on a map that is `const`: it might change it. Try, and the compiler refuses with something like "no viable overloaded operator[]", or a message that ends in "discards qualifiers".

Sometimes adding is exactly what you want. `teaTins["green"] += 3;` adds 3 to the green tins, and starts a green entry at 0 first when there is none. Counting things relies on it:

```cpp
std::map<std::string, int> orders;
for (const auto& tea : todaysOrders) {
    orders[tea]++;
}
```

The first time a tea is seen it starts at 0 and becomes 1; every time after, it goes up by one.

## Asking first

To look without adding, ask whether the key is there before you read it:

```cpp
if (teaTins.count("rooibos") > 0) { ... }
if (teaTins.find("rooibos") != teaTins.end()) { ... }
```

`count` gives back how many times the key is in the map, which for a map is 1 or 0. `find` gives back the place where the key is, or `end()`, a place just past the last entry, when it is not there; compare it with `end()`, never use it as a number. Once you know the key is there, read the value with `.at()`:

```cpp
int tins = teaTins.at("green");
```

`.at()` never adds. On a key that is not there it ends the program, with a message that says something like `out_of_range` or "key not found". That is why the asking comes first.

## In the order of the keys

A map keeps its keys sorted, whatever order they went in: texts in the order of their characters, so `"crown"` before `"mainspring"`, and capital letters before small ones. A range-based `for` goes through the entries in that order. Each entry is a pair: `.first` is the key and `.second` the value.

```cpp
for (const auto& tin : teaTins) {
    std::cout << tin.first << " x " << tin.second << "\n";
}
```

`const auto&` reads each entry where it is, as with a vector. An entry's key can never be changed in the loop; its value can, through `auto&`.

## Your work in this issue

Open `src/stock.cpp`. Each task says whether its function may change the stock. Check passes stocks of its own and looks at them again after the call, so a look-up that quietly adds a part is found out. Build and run with `g++ -std=c++17 -Wall src/stock.cpp -o stock && ./stock`.
