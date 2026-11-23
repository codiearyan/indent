// report.cpp: the end of day summary.
#include "report.h"

// Task 3: Declare and write the summary
// Write writeSummary here, as report.h declares it. It writes three lines, each with its line end:
//   Repairs: 4
//   Minutes: 240
//   Longest: ticket 3201, 75 minutes
// with how many repairs the book holds, all their minutes, and the ticket and minutes of the
// longest repair, or "Longest: none" when the book is empty.
void writeSummary(std::ostream& out, const DayBook& book) {
    out << "Repairs: " << book.count() << '\n';
    out << "Minutes: " << book.totalMinutes() << '\n';
    const Repair* longest = book.longest();
    if (longest == nullptr) {
        out << "Longest: none\n";
    } else {
        out << "Longest: ticket " << longest->ticket << ", " << longest->minutes << " minutes\n";
    }
}
