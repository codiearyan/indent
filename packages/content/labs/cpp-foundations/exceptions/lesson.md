# Exceptions: throw, try and catch

## What you will be able to do

Last issue every refusal went back one step, to the caller, as `false` or an empty optional, and the caller had to ask. Sometimes the one who can do something about a problem is several calls further up, and every function in between would have to pass the `false` along. Exceptions carry a problem up by themselves. By the end of this issue you will be able to:

- refuse with `throw`, with a message a person can act on
- catch an exception with `try` and `catch`, by const reference, and read its `what()`
- catch only the kind you can handle, and let every other go on
- choose between throwing and answering `false`

## The request from Ambrose

> **Ambrose:** Last month someone put a charge of minus 250 cents on a bill, and the program took it. Then a quote stopped halfway because one part was not in the price book. And when the till is off, the counter shows "Not added" as if the charge was wrong. Each of those wants a different answer, and I want the right one in the right place.

The billing desk is `src/billing.cpp`. The price book `priceOf` and the till `sendToTill` are given at the top. Both can throw.

## Throwing

`#include <stdexcept>` brings in the standard kinds of exception. A function that cannot do what it was asked throws one:

```cpp
void setShelf(Plant& plant, int shelf) {
    if (shelf < 1 || shelf > 8) {
        throw std::invalid_argument("there is no shelf " + std::to_string(shelf));
    }
    plant.shelf = shelf;
}
```

`throw` ends the function on the spot: nothing after it runs, and nothing comes back. The exception goes to whoever called `setShelf`, and on up through their callers, until something catches it. So check before you change anything, as the last issue taught: a throw after the change leaves the change made.

Pick the kind that says what went wrong: `std::invalid_argument` for a value that makes no sense, `std::out_of_range` for a position or a key that is not there, `std::runtime_error` for something outside the program that failed. The text you give it comes back from its `what()`. Write it for the person who will read it: what was wrong, and the value that was wrong.

Throw the exception itself. `throw new std::invalid_argument(...)` throws a pointer that nobody catches and nobody deletes. `throw 42;` and `throw "bad shelf";` compile, but no catch for an exception kind takes a number or a text.

## Catching

```cpp
try {
    setShelf(fern, typedShelf);
    std::cout << "Moved\n";
} catch (const std::invalid_argument& wrong) {
    std::cout << "Not moved: " << wrong.what() << "\n";
}
```

The `try` block runs as usual. When something in it throws, the rest of the block is skipped, and the `catch` whose kind matches runs instead. The program then carries on after the `catch`. Catch by const reference, `const std::invalid_argument&`, as above: a catch by value makes a copy, and GCC warns about it.

When an exception reaches `main` and nothing catches it, the language ends the program with `terminate`, and prints something like `terminate called after throwing an instance of 'std::invalid_argument'` with the `what()` below it, or on a Mac `libc++abi: terminating due to uncaught exception of type std::invalid_argument`. You met that line last issue, from `std::stoi`.

## Catch only what you can handle

A catch is a promise: "I know what to do about this." So catch only the kind you can handle, and let the rest go up to someone who can. A catch for `std::invalid_argument` lets a `std::runtime_error` pass straight through it, up to the caller. That is what you want.

Two catches take far more than that. `catch (...)` takes anything at all, and `catch (const std::exception&)` takes every standard kind, because they are all built on `std::exception`. Both swallow problems that were never yours, and the caller who should have heard about them never does. An empty catch, or one that only prints and carries on, does the same thing more quietly. And catching one exception only to throw a new one in its place loses what the first one said.

Keep the `try` around exactly the lines that may throw what you catch. A `try` around a whole loop stops the whole loop at the first problem; a `try` inside the loop handles one round and goes on with the next.

## Throw, or answer false?

Answer `false`, or an empty optional, when "no" is an ordinary answer the caller expects and will deal with at once: a ticket that is not on the bench, text that is not a number. Throw when the caller broke a rule it could have checked, when the function cannot do its job at all, or when the one who can deal with the problem is further up than the caller. And at the edge where a person reads the result, catch and turn the exception into words they can act on.

## Your work in this issue

Write the three functions in `src/billing.cpp`, in order, and try them in `main`. Check builds each task with a price book and a till of its own, which throw on purpose. Build and run with `g++ -std=c++17 -Wall src/billing.cpp -o billing && ./billing`.
