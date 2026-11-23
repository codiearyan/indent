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

#include <fstream>
#include <iomanip>
#include <iostream>
#include <optional>
#include <sstream>
#include <string>
#include <vector>

// Task 1: Trim a field
// Write a function called trim that takes a text as a reference to a const std::string and gives
// back a std::string: the same text without the spaces, tabs and carriage returns ('\r') at its
// start and at its end. What is between stays as it is, and a text of only those gives back "".
std::string trim(const std::string& text) {
    const std::string blanks = " \t\r";
    std::size_t first = text.find_first_not_of(blanks);
    if (first == std::string::npos) {
        return "";
    }
    std::size_t last = text.find_last_not_of(blanks);
    return text.substr(first, last - first + 1);
}

// Task 2: Split a line into fields
// Write a function called splitAt that takes a line as a reference to a const std::string and a
// separator as a char, and gives back a std::vector<std::string>: the pieces of the line between
// the separators, in order, as they are, spaces kept. A line with 2 separators has 3 fields, an
// empty field counts as one, before, between or after the separators, and an empty line is one
// empty field: a field the form left empty keeps its place.
std::vector<std::string> splitAt(const std::string& line, char separator) {
    std::vector<std::string> fields;
    std::istringstream in(line);
    std::string field;
    while (std::getline(in, field, separator)) {
        fields.push_back(field);
    }
    if (line.empty() || line.back() == separator) {
        fields.push_back("");
    }
    return fields;
}

// Task 3: Read a whole number, and nothing else
// Write a function called toWhole that takes a text as a reference to a const std::string and
// gives back a std::optional<int>: the whole number the text holds, with spaces allowed before and
// after it. It gives back std::nullopt when the text is empty, when it does not start with a whole
// number, or when anything but spaces is left after the number.
std::optional<int> toWhole(const std::string& text) {
    std::istringstream in(text);
    int number = 0;
    if (!(in >> number)) {
        return std::nullopt;
    }
    char extra = 0;
    if (in >> extra) {
        return std::nullopt;
    }
    return number;
}

// Task 4: Put a ticket line together
// Write a function called ticketLine that takes a ticket as an int, an item as a reference to a
// const std::string and parts as a double, and gives back a std::string: the ticket, a comma, the
// item, a comma, and the parts with exactly 2 decimals, with no spaces added and no line end. For
// 3101, "mantel clock" and 18.5 it gives back:
//   3101,mantel clock,18.50
std::string ticketLine(int ticket, const std::string& item, double parts) {
    std::ostringstream out;
    out << ticket << ',' << item << ',' << std::fixed << std::setprecision(2) << parts;
    return out.str();
}

int main() {
    std::cout << "Dorrit's counter lines\n";

    std::ifstream file("data/counter.txt");
    std::string line;
    while (std::getline(file, line)) {
        std::vector<std::string> fields = splitAt(line, ',');
        std::optional<int> ticket = toWhole(trim(fields[0]));
        if (ticket) {
            std::cout << "Ticket " << *ticket << " has " << fields.size() << " fields\n";
        } else {
            std::cout << '"' << trim(fields[0]) << "\" is not a ticket\n";
        }
    }
    std::cout << ticketLine(3101, "mantel clock", 18.5) << "\n";

    return 0;
}
