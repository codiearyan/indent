# Say no without exceptions

## What you will be able to do

Your functions so far trusted what they were given. Since parts 2 and 3 some of them have answered `true` or `false` when they could not do their job. This issue makes that a habit, for the most untrustworthy input there is: what a person types. By the end of it you will be able to:

- check a value before you use it, and say no before anything changes
- write a function that answers `bool` and fills in a result through a reference
- give back a `std::optional` when there may be nothing to give, and read one safely
- turn typed text into a number with `std::stoi`, and know what it does with text that is not one

## The request from Dorrit

> **Dorrit:** Customers read me their ticket number and I type it in. Yesterday I typed "4417w" by mistake and the program said repair 4417 was ready. Then I pressed Enter on nothing at all, and the whole program closed with some message about an exception. I need it to tell me plainly when what I typed is not a ticket.

The look-up is `src/counter.cpp`. The `Repair` struct is given at the top.

## Check first, then use

A value from outside your code can be anything. So the first lines of a function that takes one look at it, and say no before anything is used or changed:

```cpp
bool setShelf(Plant& plant, int shelf) {
    if (shelf < 1 || shelf > 8) {
        return false;
    }
    plant.shelf = shelf;
    return true;
}
```

The caller asks what came back. A `bool` that nobody reads says no to nobody:

```cpp
if (!setShelf(fern, typedShelf)) {
    std::cout << "There is no shelf " << typedShelf << "\n";
}
```

When a function has a result to give and may also say no, it can answer `bool` and put the result in a variable the caller hands it by reference. A function `parseQuantity(text, quantity)` built that way answers `true` when `quantity` now holds the number, and `false` when it holds whatever it held before, untouched.

## Maybe a value: std::optional

Sometimes "no" is not a failure, just nothing to give: a look-up for a plant that is not in stock. `#include <optional>` brings in `std::optional<T>`, a box that holds one `T` or holds nothing:

```cpp
std::optional<Plant> findPlant(const std::vector<Plant>& stock, const std::string& name) {
    for (const Plant& plant : stock) {
        if (plant.name == name) {
            return plant;
        }
    }
    return std::nullopt;
}
```

`return plant;` puts the plant in the box; `return std::nullopt;` (or `return {};`) gives back an empty one. The caller asks before it reaches inside:

```cpp
std::optional<Plant> found = findPlant(stock, "basil");
if (found.has_value()) {
    std::cout << found->count << "\n";
}
```

`if (found)` asks the same. Inside, `*found` is the plant and `found->count` one of its members. Reaching inside an empty optional with `*` or `->` has no promised result, so ask first, every time. `found.value()` is the careful way in: on an empty optional it throws an exception, which you will meet properly in the next issue.

## Text into a number: std::stoi

`std::stoi("4417")` gives back the `int` 4417. It is in `<string>`. What it does with other text matters more:

- It reads digits from the front and stops at the first character that is not one. `std::stoi("12abc")` gives back 12 and says nothing about the rest. So does `std::stoi(" 12")`: it skips spaces at the front.
- When the text does not start with a number at all, `""` or `"abc"`, it throws an exception. Nothing catches it yet, so the program ends with a message that is something like `terminate called after throwing an instance of 'std::invalid_argument'`, or `libc++abi: terminating due to uncaught exception` on a Mac. In both, `terminate` is the language ending a program that let an exception go uncaught.
- A number too large for an `int`, like `"99999999999"`, throws too, as `std::out_of_range`.

So `std::stoi` is no test of whether text is a number. Look at every character yourself first, and hand the text over only once you know. A loop over a text gives its characters one by one, and the digits `'0'` to `'9'` follow one another, so a character between them is a digit:

```cpp
for (char c : code) {
    if (c < '0' || c > '9') {
        return false;
    }
}
```

That loop is not the whole test. An empty text passes it without a single round, and a long run of digits passes it and is still too big for an `int`. Each needs a check of its own, before the text reaches `std::stoi`.

## Your work in this issue

Write the three functions in `src/counter.cpp`, in order. The third uses the first two, and Check builds it with right versions of its own for them. Try each one in `main` with what Dorrit typed today. Build and run with `g++ -std=c++17 -Wall src/counter.cpp -o counter && ./counter`.
