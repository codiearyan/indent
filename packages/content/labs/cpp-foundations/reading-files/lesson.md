# Reading a file

## What you will be able to do

Every program so far knew only what was typed in or written into its code. The workshop's lists live on disk, in files. This part is about files, and about building a program properly, and it is the last part of the repo. By the end of this issue you will be able to:

- open a file for reading, and know whether it really opened
- read a file line by line, and know when you have reached its end
- read words and numbers from a file with `>>`, and notice text that is not a number
- write one function that reads a file, the terminal, or any other stream

## The request from Kasimir

> **Kasimir:** The drawer list is in a text file now, and so are my bench notes. Every morning I copy them into the program by hand, and every morning I get one wrong. The files are right there. Read them.

His files are in `data/`: `drawer.txt` holds each part with its count, and `notes.txt` holds his notes, with how many there are on the first line. The code goes in `src/stocktake.cpp`.

## Opening a file

`std::ifstream`, from `<fstream>`, is a stream that reads a file. It works like `std::cin`, with a file in place of the keyboard:

```cpp
std::ifstream menu("data/teas.txt");
if (!menu) {
    std::cout << "The tea list did not open\n";
}
```

Forget `#include <fstream>` and the compiler stops at the first line that uses it, with something like `incomplete type` or `implicit instantiation of undefined template`.

A file can fail to open: a wrong name, a folder that is not there. Nothing tells you so. The stream simply goes into a failed state, and every read from it reads nothing. A program that never asks carries on with an empty list and prints a total of 0, which looks like a fine answer. So ask, right after opening: a stream in an `if` is true while all is well, and `!menu` is true when it did not open. `menu.is_open()` asks the same.

A path like `data/teas.txt` is looked for from the folder the program runs in, not the folder of the `.cpp` file. In the terminal that is the folder you are in, so run the program from the workspace folder.

## Line by line

`std::getline` reads one line into a `std::string`, from any stream, and gives back the stream it read from. That makes the read itself a good loop condition:

```cpp
std::string tea;
while (std::getline(menu, tea)) {
    std::cout << "We have " << tea << "\n";
}
```

Each round reads a line, without its line end, and the loop stops when a read finds nothing more. An empty line reads as an empty text, and a last line with no line end is still read.

There is a well-known way to get this wrong:

```cpp
while (!menu.eof()) {          // wrong
    std::getline(menu, tea);
    std::cout << "We have " << tea << "\n";
}
```

`eof()` only turns true once a read has tried to go past the end. After the last line, nothing has tried yet, so the loop goes round once more, the read fails, and the body uses whatever is left in `tea`: an empty line, or the last one twice. Ask the read, not `eof()`.

## Words and numbers

`>>` reads from a file exactly as it reads typing: it skips spaces and line ends, then reads one word into a `std::string` or one number into an `int`. A file of prices, one number after another, adds up in a loop whose condition is the read:

```cpp
int price = 0;
int total = 0;
while (prices >> price) {
    total += price;
}
```

When `>>` meets text that is not a number, the read fails, and the stream stays failed, as `std::cin` did in part 2: every read after it fails at once, without reading anything, so the loop above stops there. When a read reaches the end of the file, it fails too, and `eof()` turns true as well. After this loop, `prices.eof()` says which of the two stopped it: the end, or a word where a number should be.

That works because each round reads one thing. When a round reads two, a name and then a number, the end can come between them, and `eof()` is true then too. Asking each read on its own whether it worked tells every case apart.

## One function for any stream

`std::ifstream` is one kind of `std::istream`, and so is `std::cin`. A function that takes a `std::istream&` can be handed either:

```cpp
int countTeas(std::istream& in);

std::ifstream menu("data/teas.txt");
countTeas(menu);       // a file
countTeas(std::cin);   // what someone types
```

A stream is always handed on by reference. It cannot be copied: it is one place being read, at one position, and the compiler refuses a copy with something like `deleted constructor`.

## Your work in this issue

Write the three tasks in `src/stocktake.cpp`, and try each in `main` on the files in `data/`. Build and run from the workspace folder with `g++ -std=c++17 -Wall src/stocktake.cpp -o stocktake && ./stocktake`. For `readLines`, Check writes files of its own and hands you their paths. For the other two, it hands you streams that hold text of its own, which read just like a file.
