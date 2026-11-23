// main.cpp: the day book program. It reads data/day.csv into a day book and writes the summary.
// Build it with build.sh, step by step, and run it from the workspace folder:
//   sh build.sh && ./daybook

#include <fstream>
#include <iostream>

#include "daybook.h"
#include "report.h"

int main() {
    std::ifstream file("data/day.csv");
    if (!file) {
        std::cout << "data/day.csv did not open\n";
        return 1;
    }
    DayBook book;

    // Once Tasks 1 to 3 are written, try them here: load the file into book, print how many
    // lines it refused, and write the summary to std::cout.
    std::cout << book.count() << " repairs in the day book\n";

    return 0;
}
