# Values and types

## What you will be able to do

The laptop at Tolliver Clockworks can talk now. Next come the repair tickets. Every clock that comes in gets a slip from Dorrit at the counter: a number, the customer, the item, a price. On paper, each of those is a box on the slip. In a program, each one is a variable. By the end of this issue you will be able to:

- make a variable with a type, a name and a value
- choose between `int`, `double`, `char`, `bool` and `std::string`
- print variables and text together on one line
- give a variable a new value, and know why it needs one from the start

## The request from Dorrit

Dorrit slides a carbon copy across the counter.

> **Dorrit:** This is Edwina Sallow's carriage clock, ticket 2187. I write the same line on every slip and I get the number wrong when it's busy. Can the laptop write the ticket line for me? And it has to say where the clock waits and how many days we promised. Last time I tried, it told me we'd be ready in 32,767 days.

All four tasks are in `src/ticket.cpp`.

## A variable has a type

A variable is a named box that holds one value. In C++ you say what kind of value the box holds when you make it. That is its **type**:

```cpp
int cupsPoured = 12;
double litresLeft = 1.75;
char row = 'C';
bool kettleOn = true;
std::string flavour = "earl grey";
```

Read each line from left to right: the type, the name, `=`, the value, a semicolon. `int` holds whole numbers. `double` holds numbers with a decimal point. `char` holds one character, in single quotes. `bool` holds `true` or `false`. `std::string` holds text, in double quotes, and needs `#include <string>` at the top of the file.

The type is fixed for good. A box made for an `int` will never hold text. Names follow a few rules: letters, digits and `_`, no spaces, not starting with a digit, and capital letters count, so `cupsPoured` and `cupspoured` are two different names. Most C++ code writes names like `cupsPoured`, with a capital for each new word.

## Printing variables

`<<` sends one piece at a time to `std::cout`, and a variable is sent by its name, with no quotes:

```cpp
std::cout << "Row " << row << " has " << cupsPoured << " cups\n";
```

prints `Row C has 12 cups`. `<<` puts nothing between the pieces, so the spaces belong inside the quoted text. With quotes, `"row"` is just the three letters r, o, w; without them, `row` is the variable. A `bool` prints as `1` for true and `0` for false.

## A new value

To change what a variable holds, write its name, `=` and the new value, with no type in front:

```cpp
cupsPoured = cupsPoured + 3;
```

The right side is worked out first, with the old value, and the result goes into the box. So this adds 3. One `=` gives a value; two, `==`, compare two values, which comes in a later issue.

Writing the type again, `int cupsPoured = cupsPoured + 3;`, makes a second variable with the same name, and the compiler refuses it with an error that says the name is defined or declared a second time.

## Every variable needs a value

You can make a variable without a value: `int cupsLeft;`. C++ does not fill it in for you. The box holds whatever was left in that memory before, and printing it gives a nonsense number that can change from one run to the next. That is where Dorrit's 32,767 days came from. With `-Wall`, the compiler often warns about it. Give every variable its value on the line that makes it.

## When the types do not fit

The compiler checks every value against the type of its box. Three errors you will meet here:

- **A value that does not fit.** `char row = "C";` gives text to a box for one character. The message says the value cannot be converted or used to initialize a `char`. Single quotes hold one character, double quotes hold text.
- **A name it does not know.** `std::cout << cupPoured;` is a typo. The message says `cupPoured` is not declared. Check the spelling and the capitals, and that the variable is made above the line that uses it.
- **Text in single quotes.** `'earl grey'` is not text. The compiler warns about a multi-character constant and treats it as a number, so it prints digits.

As in the first issue, the start of each message is the same everywhere: the file, the line, and `error` or `warning`. The words after it differ between compilers, and the name they mention is your best clue.

## Your work in this issue

Open `src/ticket.cpp`. Today's slip is at the top of `main`: the ticket number, the customer, the item, the quote, the price of a key and the promised days. Check puts other tickets in those variables, so build every task on the names, not on the values. Build and run with `g++ -std=c++17 -Wall src/ticket.cpp -o ticket && ./ticket`, read what it prints and any warning above it, and work through the four tasks in order.
