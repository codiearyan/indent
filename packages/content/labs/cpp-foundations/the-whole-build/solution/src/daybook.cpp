// daybook.cpp: the member functions of DayBook.
#include "daybook.h"

#include <algorithm>
#include <string>

int DayBook::count() const {
    return static_cast<int>(repairs.size());
}

int DayBook::totalMinutes() const {
    int total = 0;
    for (const Repair& repair : repairs) {
        total += repair.minutes;
    }
    return total;
}

const std::vector<Repair>& DayBook::all() const {
    return repairs;
}

// Task 1: Load the day
// Write DayBook::load, as daybook.h declares it. It reads the day's file from the stream: the
// first line is a heading, which it skips, and so is every line that is empty or only blanks.
// Every other line that parseRepair takes is added to the book's repairs, in order. It gives back
// how many lines it refused.
int DayBook::load(std::istream& in) {
    std::string line;
    int number = 0;
    int refused = 0;
    while (std::getline(in, line)) {
        number++;
        if (number == 1 || line.find_first_not_of(" \t\r") == std::string::npos) {
            continue;
        }
        Repair repair;
        if (parseRepair(line, repair)) {
            repairs.push_back(repair);
        } else {
            refused++;
        }
    }
    return refused;
}

// Task 2: Find the longest repair
// Write DayBook::longest, as daybook.h declares it, with std::max_element. It gives back the
// address of the repair in the book with the most minutes, the first of them when several have as
// many, or nullptr when the book is empty.
const Repair* DayBook::longest() const {
    if (repairs.empty()) {
        return nullptr;
    }
    auto found = std::max_element(repairs.begin(), repairs.end(), [](const Repair& a, const Repair& b) {
        return a.minutes < b.minutes;
    });
    return &*found;
}
