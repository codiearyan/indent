# Reading what people type

## What you will be able to do

Every value so far was written into the program before it was built. To take in a new clock, Dorrit had to change the code and build again. A real intake program asks its questions and reads what she types. By the end of this issue you will be able to:

- read a number with `std::cin`
- read a whole line, spaces included, with `std::getline`
- read a number followed by a line of text without losing the text
- notice when what was typed is not a number, and ask again

## The request from Dorrit

> **Dorrit:** I can't edit code at the counter with a customer waiting. Make it ask me: how many clocks, what are they, who's the customer. I'll type, it remembers. And if I type something silly, it should tell me, not carry on with nonsense.

All four tasks are in `src/intake.cpp`, each a function above `main`.

## Reading a number

`std::cin` is the other half of `std::cout`. It reads what is typed in the terminal, and `>>` reads into a variable that already exists:

```cpp
int cups = 0;
std::cout << "How many cups? ";
std::cin >> cups;
```

The program prints the question and then waits. When you type `3` and press Enter, `cups` becomes 3 and the program goes on. `>>` skips spaces and line ends before the number, then reads digits until something that is not one, and stops there.

Try it by running your program in the terminal and typing. A program waiting for typing looks as if it is stuck; it is waiting for you. If you started it by mistake, Ctrl+C stops it.

## Reading a line

`>>` reads one word for a `std::string`: it stops at the first space. To read everything up to the end of the line, use `std::getline`:

```cpp
std::string tea;
std::cout << "Which tea? ";
std::getline(std::cin, tea);    // earl grey, both words
```

`std::getline` reads up to the line end, keeps everything before it, spaces included, and throws the line end away.

## A number followed by a line

Put the two together and a trap appears:

```cpp
std::cin >> cups;
std::getline(std::cin, tea);
```

You type `3`, press Enter, and the program does not wait for the tea at all: `tea` is empty. `>>` read the 3 and stopped right before the line end you typed after it. That line end is still waiting, and `std::getline` reads up to the first line end it meets, which is right there. It reads an empty line and is done.

The cure is to skip what is left before reading the line. `std::ws` skips spaces and line ends:

```cpp
std::cin >> cups;
std::getline(std::cin >> std::ws, tea);
```

`std::getline(std::cin, rest)` into a variable you do not use, right after the number, works too: it reads the empty rest of the line and throws it away.

## Input that is not a number

If you type `lots` where `std::cin >> cups` wants a number, the read fails. `cups` becomes 0, and `std::cin` goes into a failed state: every read after that fails at once, without waiting, until it is told to go on. The text it could not read stays waiting too.

A read can stand in an `if`. It is true when it worked and false when it failed:

```cpp
if (std::cin >> cups) {
    // a number was read
} else {
    std::cin.clear();                 // go on reading
    std::string rest;
    std::getline(std::cin, rest);     // throw the bad line away
}
```

To ask until the answer is good, put the question and the read in `while (true) { ... }`, a loop whose condition never turns false, and leave it with `return` once a number is read: `return` ends the whole function, loop and all.

Both steps are needed. Without `clear()`, `std::cin` keeps failing. Without throwing the bad line away, the next read meets the same text and fails again. In a loop that asks again, either one missing makes the loop go round without end.

## How Check types

Check calls your functions from code of its own and types on their standard input itself, line by line, as if someone sat at the counter. When it has typed its lines, the input ends. A function that tries to read more than it was given would sit waiting at the counter; Check notices that and says so.

## Your work in this issue

Open `src/intake.cpp`. Write each function under its `// Task` comment, then call them from `main`, run the program and type the answers. Build and run with `g++ -std=c++17 -Wall src/intake.cpp -o intake && ./intake`.
