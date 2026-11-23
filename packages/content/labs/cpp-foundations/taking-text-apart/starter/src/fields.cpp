// Dorrit's counter lines: each ticket typed as one line, with commas between its fields, stray
// spaces and slips. Taken apart into fields here, and put back together. Build it and run it from
// the workspace folder with:
//   g++ -std=c++17 -Wall src/fields.cpp -o fields && ./fields
//
// Your tasks, each under its own // Task comment, above main:
//   1. Trim a field
//   2. Split a line into fields
//   3. Read a whole number, and nothing else
//   4. Put a ticket line together

#include <iostream>
#include <string>
#include <vector>

// Task 1: Trim a field
// Write a function called trim that takes a text as a reference to a const std::string and gives
// back a std::string: the same text without the spaces, tabs and carriage returns ('\r') at its
// start and at its end. What is between stays as it is, and a text of only those gives back "".

// Task 2: Split a line into fields
// Write a function called splitAt that takes a line as a reference to a const std::string and a
// separator as a char, and gives back a std::vector<std::string>: the pieces of the line between
// the separators, in order, as they are, spaces kept. A line with 2 separators has 3 fields, an
// empty field counts as one, before, between or after the separators, and an empty line is one
// empty field: a field the form left empty keeps its place.

// Task 3: Read a whole number, and nothing else
// Write a function called toWhole that takes a text as a reference to a const std::string and
// gives back a std::optional<int>: the whole number the text holds, with spaces allowed before and
// after it. It gives back std::nullopt when the text is empty, when it does not start with a whole
// number, or when anything but spaces is left after the number.

// Task 4: Put a ticket line together
// Write a function called ticketLine that takes a ticket as an int, an item as a reference to a
// const std::string and parts as a double, and gives back a std::string: the ticket, a comma, the
// item, a comma, and the parts with exactly 2 decimals, with no spaces added and no line end. For
// 3101, "mantel clock" and 18.5 it gives back:
//   3101,mantel clock,18.50

int main() {
    std::cout << "Dorrit's counter lines\n";

    // Try each task here once you have written it: read data/counter.txt line by line, as this
    // part's first issue did, split each line at its commas, trim each field, and print the ticket
    // that toWhole reads, or that it is not a number. Then print ticketLine(3101, "mantel clock", 18.5).
    // Check calls your functions with texts of its own.

    return 0;
}
