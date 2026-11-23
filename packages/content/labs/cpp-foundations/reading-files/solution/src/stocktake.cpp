// Kasimir's stocktake: the parts drawer and the bench notes, read from files on disk instead of
// typed in. Build it and run it from the workspace folder with:
//   g++ -std=c++17 -Wall src/stocktake.cpp -o stocktake && ./stocktake
//
// Your tasks, each under its own // Task comment, above main:
//   1. Read every line of a file
//   2. Add up the drawer
//   3. Read the bench notes

#include <fstream>
#include <iostream>
#include <string>
#include <vector>

// Task 1: Read every line of a file
// Write a function called readLines that takes a path as a reference to a const std::string and
// the lines as a reference to a std::vector<std::string>, and gives back a bool. It opens the file
// at that path. When the file does not open, it gives back false and leaves lines as they were.
// Otherwise it adds each line of the file to the end of lines, in order, without its line end, an
// empty line as an empty text, and gives back true.
bool readLines(const std::string& path, std::vector<std::string>& lines) {
    std::ifstream file(path);
    if (!file) {
        return false;
    }
    std::string line;
    while (std::getline(file, line)) {
        lines.push_back(line);
    }
    return true;
}

// Task 2: Add up the drawer
// Write a function called totalParts that takes a stream as a reference to a std::istream and
// gives back an int. The stream holds pairs: a part's name, one word, and then its count, a whole
// number, with spaces or line ends between them. It reads to the end and gives back the counts
// added up, 0 for an empty stream. When a name is not followed by a whole number, it gives back -1.
int totalParts(std::istream& in) {
    std::string name;
    int count = 0;
    int total = 0;
    while (in >> name) {
        if (!(in >> count)) {
            return -1;
        }
        total += count;
    }
    return total;
}

// Task 3: Read the bench notes
// Write a function called readNotes that takes a stream as a reference to a std::istream and gives
// back a std::vector<std::string>. The first line of the stream holds how many notes follow, as a
// whole number. Each note is the whole of the line after it, spaces kept. It gives back those
// notes, in order: no more than the first line says, and only the ones the stream really holds.
std::vector<std::string> readNotes(std::istream& in) {
    std::vector<std::string> notes;
    int count = 0;
    if (!(in >> count)) {
        return notes;
    }
    std::string rest;
    std::getline(in, rest);
    std::string note;
    while (static_cast<int>(notes.size()) < count && std::getline(in, note)) {
        notes.push_back(note);
    }
    return notes;
}

int main() {
    std::cout << "Kasimir's stocktake\n";

    std::vector<std::string> lines;
    if (readLines("data/notes.txt", lines)) {
        for (const std::string& line : lines) {
            std::cout << "  " << line << "\n";
        }
    } else {
        std::cout << "data/notes.txt did not open\n";
    }

    std::ifstream drawer("data/drawer.txt");
    std::cout << "Parts in the drawer: " << totalParts(drawer) << "\n";

    std::ifstream notesFile("data/notes.txt");
    for (const std::string& note : readNotes(notesFile)) {
        std::cout << "Note: " << note << "\n";
    }

    return 0;
}
