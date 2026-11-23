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

    int refused = book.load(file);
    std::cout << "Refused lines: " << refused << "\n";
    writeSummary(std::cout, book);

    return 0;
}
