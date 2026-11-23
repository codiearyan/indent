# Vectors and functions

## What you will be able to do

The last two issues handed a vector to a function and let it read or change it. This issue is about that hand-over itself: who owns the list, who may change it, and how a function gives a whole new list back. These are the choices behind almost every function that works on a list. By the end of this issue you will be able to:

- take a vector by `const` reference, and say why not by copy
- change the caller's vector through a reference
- give back a new vector from a function
- fill a vector from what someone types

## The request from Dorrit

> **Dorrit:** When a clock is mended, the customer's name goes on the pickup shelf. People ring and ask if theirs is ready, new ones arrive in batches, and sometimes I only remember that the name started with an O. And I'd like to type the morning's ticket numbers in one go, not one program run each.

All four tasks are in `src/shelf.cpp`, each a function above `main`.

## Reading: a const reference

A function that only looks at a vector takes it as a `const` reference:

```cpp
int strongCups(const std::vector<int>& cups) { ... }
```

Taken as a copy instead, `std::vector<int> cups`, the function gets its own list, and every value in the caller's list is copied into it on every call. With three values nobody notices. With a list of every order of the year, the program spends its time copying. The `&` says "the caller's own list, no copy", and `const` promises the function will not change it. Break the promise, with `cups.push_back(5)` or `cups[0] = 2`, and the compiler refuses the line. The message is about the call or the `=`, and says something like no matching member function for call to `push_back`, or no matching function for a call that ends in `const`, or that the value is read-only. Whenever you see `const` in a message about a vector, look at whether the line changes something the function only promised to read.

## Changing: a reference

A function that changes the caller's list takes a reference without `const`, as in the references issue:

```cpp
void addSugar(std::vector<int>& cups, int spoons) {
    cups.push_back(spoons);
}
```

The call looks the same either way: `addSugar(order, 2)`. Only the first line of the function says whether `order` can change, so it is worth reading first lines carefully, your own included. A function can take two vectors and treat them differently: one by reference, to change it, and one by `const` reference, to read from it.

A `const` reference also accepts a list written on the spot, in braces: `strongCups({3, 1, 4})`. A reference without `const` takes only a variable.

## Giving back a new vector

A function can make a vector of its own and give it back:

```cpp
std::vector<int> doubled(const std::vector<int>& cups) {
    std::vector<int> result;
    for (int c : cups) {
        result.push_back(c * 2);
    }
    return result;
}
```

The caller's `cups` is untouched, and the caller gets a new list: `std::vector<int> big = doubled(cups);`. Giving back a vector does not copy it value by value. The function's list is handed over to the caller as it is, so this is the plain way to give back a list, however long.

Choosing between the two shapes is a question of what the caller wants. "Make my list longer" is a reference. "Give me a list made from mine" is a new vector, and the caller's stays as it was.

## Filling a vector from input

In the reading-input issue, a read stood in an `if`: true when it worked. It can stand in a `while` just as well, and the loop goes on as long as reads work:

```cpp
std::vector<int> cups;
int c = 0;
while (std::cin >> c && c > 0) {
    cups.push_back(c);
}
```

The condition reads a number and then asks about it, in that order: `&&` looks at its right side only when the left side was true. The loop stops at the first number that is not above 0, and also when the input ends or is not a number, because then the read itself is false. The number that stopped it is never added. Without the read in the condition, a loop like this can go on reading after the input has ended, and in the terminal it would sit and wait.

## Your work in this issue

Open `src/shelf.cpp`. Each task says how its function takes each list. Check passes lists of its own and looks at them again after the call: a list that must not change is found out when it does, and a list that must change is judged by what the caller has afterwards. Build and run with `g++ -std=c++17 -Wall src/shelf.cpp -o shelf && ./shelf`.
