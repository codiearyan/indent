# Text with std::string

## What you will be able to do

Every clock at Tolliver Clockworks wears a paper tag on a string: the customer's name, the shelf it waits on, what it is. Dorrit writes them by hand, and on a busy Saturday the handwriting goes. The laptop can print tags, if it can work with text. By the end of this issue you will be able to:

- join pieces of text into one with `+`
- ask a text how many characters it has
- take one character, or a piece, out of a text
- turn a number into text so it can be joined to other text

## The request from Dorrit

> **Dorrit:** The tags. Surname first, so they sort on the shelf. A code for the shelf that Kasimir can read from across the room. And the small tags only fit eight letters, so I cut the item short. Can it do all that from my slip?

All four tasks are in `src/tags.cpp`.

## Joining text

You met `std::string` in the second issue. It holds text, and `+` joins two texts into one:

```cpp
std::string tea = "earl grey";
std::string order = tea + " with milk";   // "earl grey with milk"
```

`+` puts nothing in between. Spaces, commas and anything else go in a piece of text of their own. You can join as many pieces as you like, from left to right. `+=` adds to the end of a text that already exists: `order += ", no sugar";`.

There is one trap. Text written in double quotes on its own is not a `std::string` yet; it is older and simpler. Two of them cannot be joined: `"earl" + " grey"` is refused by the compiler with an error about invalid operands to `+`. As long as one side of each `+` is a `std::string`, it works, so start with the variable.

## How long is a text

A `std::string` can tell you things about itself. You ask with a dot after its name and round brackets:

```cpp
std::string tea = "earl grey";
std::cout << tea.size() << "\n";   // 9
```

`.size()` gives the number of characters, the space included. `.length()` gives the same number; use whichever reads better. Do not reach for `sizeof`: it gives the bytes the variable takes in memory, which is the same for every `std::string`, however long its text.

## One character, or a piece

Square brackets after a text give one character of it, as a `char`. Positions count from 0, so the first character is at 0 and the last at `size() - 1`:

```cpp
char first = tea[0];   // 'e'
char second = tea[1];  // 'a'
```

`.substr` gives a piece of the text as a new `std::string`. It takes where the piece starts and how many characters it has:

```cpp
std::string word = tea.substr(0, 4);   // "earl"
std::string rest = tea.substr(5, 4);   // "grey"
```

Asking for more characters than are left is fine: the piece just stops at the end, so `tea.substr(0, 50)` is the whole text. Starting past the end is not: the program stops with an error about `out_of_range` when it runs.

## Numbers are not text

A number and a text cannot be joined with `+`. And a `char` plus a number is worse, because it compiles: a character is stored as a small number, so `'e' + 5` adds them up and gives another number, not text. To join a number to text, turn it into text first with `std::to_string`:

```cpp
int pot = 3;
std::string label = "Pot " + std::to_string(pot);   // "Pot 3"
```

`std::to_string` turns an `int` into its digits as a `std::string`. Here `"Pot "` can join it because the right side is a `std::string`. A `char` joins a `std::string` the same way: `tea[0] + std::to_string(pot)` is `"e3"`.

## Your work in this issue

Open `src/tags.cpp`. Dorrit's slip is at the top of `main`: the first name, the last name, the item and the ticket number. Check tries other customers, so build every task on the names. Build and run with `g++ -std=c++17 -Wall src/tags.cpp -o tags && ./tags` after each task. When the compiler refuses a line, the types it names in its message tell you which of the traps above you met.
