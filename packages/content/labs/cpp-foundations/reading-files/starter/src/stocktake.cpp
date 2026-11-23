// Kasimir's stocktake: the parts drawer and the bench notes, read from files on disk instead of
// typed in. Build it and run it from the workspace folder with:
//   g++ -std=c++17 -Wall src/stocktake.cpp -o stocktake && ./stocktake
//
// Your tasks, each under its own // Task comment, above main:
//   1. Read every line of a file
//   2. Add up the drawer
//   3. Read the bench notes

#include <iostream>
#include <string>
#include <vector>

// Task 1: Read every line of a file
// Write a function called readLines that takes a path as a reference to a const std::string and
// the lines as a reference to a std::vector<std::string>, and gives back a bool. It opens the file
// at that path. When the file does not open, it gives back false and leaves lines as they were.
// Otherwise it adds each line of the file to the end of lines, in order, without its line end, an
// empty line as an empty text, and gives back true.

// Task 2: Add up the drawer
// Write a function called totalParts that takes a stream as a reference to a std::istream and
// gives back an int. The stream holds pairs: a part's name, one word, and then its count, a whole
// number, with spaces or line ends between them. It reads to the end and gives back the counts
// added up, 0 for an empty stream. When a name is not followed by a whole number, it gives back -1.

// Task 3: Read the bench notes
// Write a function called readNotes that takes a stream as a reference to a std::istream and gives
// back a std::vector<std::string>. The first line of the stream holds how many notes follow, as a
// whole number. Each note is the whole of the line after it, spaces kept. It gives back those
// notes, in order: no more than the first line says, and only the ones the stream really holds.

int main() {
    std::cout << "Kasimir's stocktake\n";

    // Try each task here once you have written it: read data/notes.txt with readLines and print
    // each line, open data/drawer.txt and print what totalParts gives for it, and do the same for
    // readNotes with data/notes.txt. Check calls your functions with files and streams of its own.

    return 0;
}
