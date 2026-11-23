# Writing a file

## What you will be able to do

Last issue read files that someone else wrote. This one writes them: a sheet that lines up in columns, and a log that grows by a line each day and keeps what it had. By the end of this issue you will be able to:

- open a file for writing, in place of what was there or after it
- line up columns with widths and a set number of decimals
- say when what you wrote has really reached the file
- write one function that writes to the terminal, to a file, or to any stream

## The request from Ambrose

> **Ambrose:** At the end of the day I copy the bills onto a sheet, line them up with a ruler, and add a line to the logbook. I want the program to write the sheet for me, columns straight, and add today's line to the log without losing the days before it.

The code goes in `src/sheet.cpp`. The `Bill` struct is given at the top.

## Opening a file for writing

`std::ofstream`, from `<fstream>`, is a stream that writes a file. It is written to with `<<`, as `std::cout` is:

```cpp
std::ofstream board("board.txt");
if (!board) {
    std::cout << "The board did not open\n";
}
board << "Earl grey\n";
```

Opened with only a path, it makes the file when it is not there, and when it is there, it empties it first: whatever was in it is gone. It can fail to open, for example when the folder in the path does not exist, and as with reading, nothing says so: every write to it does nothing. Ask right after opening.

To keep what is there and write after it, open it with a second value:

```cpp
std::ofstream visits("visits.txt", std::ios::app);   // app: add at the end
```

A line end is written like any other text, `'\n'` or `std::endl`. Without one, the next thing written lands on the same line.

## Columns that line up

`<iomanip>` has the tools for columns. `std::setw(10)` makes the next value take at least 10 columns, filling the rest with spaces. It counts for that one value only, so each column gives its own. `std::left` and `std::right` say which side the value starts from, and they stay set for everything after them, as `std::fixed` and `std::setprecision` do:

```cpp
board << std::left << std::setw(12) << "Assam"
      << std::right << std::setw(7) << std::fixed << std::setprecision(2) << 4.5 << '\n';
// Assam          4.50
```

A value wider than its width is written whole, and pushes the rest of the line along. Count columns by hand once: `Assam` and 7 spaces make 12, then `4.50` with 3 spaces before it makes 7.

## When the words reach the disk

Writing to a file is slow next to writing to memory, so a stream keeps what you write in a buffer, its own small store, and hands it to the file in large pieces. Everything reaches the file when the stream ends: at the closing `}` of the block that made it, or when you call `close()`. `std::endl` also hands it over at once; `'\n'` does not.

Usually you never notice. You do when the same program writes a file and then reads it back:

```cpp
std::ofstream visits("visits.txt", std::ios::app);
visits << "Thursday\n";
std::ifstream check("visits.txt");   // may not see Thursday yet
```

The reader opens the file while Thursday is still in the writer's buffer. End the writer first: give it a block of its own, `{ std::ofstream visits(...); visits << "Thursday\n"; }`, and read after the `}`.

## One function for any stream

`std::ofstream` is one kind of `std::ostream`, and so is `std::cout`. A function that takes a `std::ostream&` writes wherever it is pointed:

```cpp
void writeTea(std::ostream& out, const std::string& tea) {
    out << tea << '\n';
}

writeTea(std::cout, "Assam");   // the terminal
writeTea(board, "Assam");       // a file
```

So the same line can be tried in the terminal first and then written to the file. A stream is handed on by reference, never copied.

## Your work in this issue

Write the three tasks in `src/sheet.cpp`, and try each in `main`. Build and run from the workspace folder with `g++ -std=c++17 -Wall src/sheet.cpp -o sheet && ./sheet`, run it again, and look at both files with `cat sheet.txt log.txt`. Check hands `writeBillLine` a string stream of its own, and the other two paths of files it wrote first, and it reads every file back once your function has returned.
