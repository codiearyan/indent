// daybook.cpp: the member functions of DayBook.
#include "daybook.h"

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

// Task 2: Find the longest repair
// Write DayBook::longest, as daybook.h declares it, with std::max_element. It gives back the
// address of the repair in the book with the most minutes, the first of them when several have as
// many, or nullptr when the book is empty.
