# Text taken apart and put together

## What you will be able to do

A file is lines, and a line of data is fields: a ticket, an item, minutes, each with a comma between them. Before a program can use them, it has to take each line apart, clean each piece, and turn the numbers into numbers, and to write a file back, it puts lines together. By the end of this issue you will be able to:

- read from a text and write into one with string streams
- split a line at a separator, empty fields included
- trim the blanks around a field, a Windows line end among them
- turn a field into a number only when it really is one

## The request from Dorrit

> **Dorrit:** The counter's form saves every ticket as one line, with commas. People type it, so there are spaces everywhere, sometimes a field is missing, and once somebody typed the letter o in a ticket number. I need each line taken apart properly, and told when a field is wrong instead of guessed at.

Some of today's lines are in `data/counter.txt`. The code goes in `src/fields.cpp`.

## A text as a stream

`<sstream>` has two streams that work on a `std::string` instead of a file. `std::istringstream` reads from a text with everything a file stream has, `>>` and `std::getline` included:

```cpp
std::istringstream order("earl grey;2;3.50");
```

`std::ostringstream` writes into a text. Everything sent to it with `<<` collects inside, numbers formatted as `std::cout` would, and `.str()` gives the text back:

```cpp
std::ostringstream label;
label << "Tea " << 2 << " for " << std::fixed << std::setprecision(2) << 3.5;
std::string text = label.str();   // "Tea 2 for 3.50"
```

That is the usual way to build a line with numbers in it. `std::to_string` works too for whole numbers, but for a `double` it always writes six decimals: `std::to_string(3.5)` is `"3.500000"`.

## Splitting at a separator

`std::getline` takes a third value: the character to stop at instead of the line end. On a string stream, it reads one field at a time:

```cpp
std::string piece;
while (std::getline(order, piece, ';')) {
    std::cout << "[" << piece << "]\n";   // [earl grey] [2] [3.50]
}
```

Spaces stay in the pieces: only the separator splits. One case slips through. `"earl grey;2;"` has an empty third field, but the loop stops when the text ends and never reads it, so it finds two. The same goes for an empty line, which is one empty field. Count separators: n of them make n + 1 fields.

That count matters, because a line with a field missing is the usual mistake in a data file. Ask how many fields there are before you use the fourth: `fields[3]` on a line of three reads past the end of the vector.

## Trimming

People type spaces around fields, and a file written on Windows ends every line with a carriage return, `'\r'`, before the line end. `std::getline` keeps it, so `"18.50\r"` arrives at the end of the last field. It prints as nothing at all, and it makes the field fail as a number.

A text can be searched for the first character that is not one of a set: `find_first_not_of(" \t\r")` searches from the front, `find_last_not_of` from the back. Each gives back a position, or `std::string::npos` when there is none. `npos` is a position far past the end of any text, and `.substr` throws `std::out_of_range` when it is handed one as its start.

## Text into a number

Part 7 met `std::stoi`: it reads `"12abc"` as 12 and throws on `"abc"`. A string stream reads a number the way `>>` reads a file, and can then be asked what is left:

```cpp
std::istringstream in(" 3.50 ");
double price = 0;
bool read = static_cast<bool>(in >> price);
in >> std::ws;                     // skip the spaces after it
bool clean = read && in.eof();     // nothing else left
```

Reading the number fails on a text that does not start with one, an empty text included: an empty field is not 0, it is no number at all. Reading stops at the first character that cannot be part of the number, and `in.eof()` after skipping the spaces says whether that was the end.

A string stream that failed stays failed, like any stream. Make a new one for each text, rather than handing an old one a new text.

## Your work in this issue

Write the four tasks in `src/fields.cpp`, and try them in `main` on `data/counter.txt`. Build and run from the workspace folder with `g++ -std=c++17 -Wall src/fields.cpp -o fields && ./fields`. Check calls your functions with texts of its own.
