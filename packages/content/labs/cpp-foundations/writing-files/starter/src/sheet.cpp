// Ambrose's day sheet: the day's bills written to a file whose columns line up, and a log that
// grows by one line a day. Build it and run it from the workspace folder with:
//   g++ -std=c++17 -Wall src/sheet.cpp -o sheet && ./sheet
//
// Your tasks, each under its own // Task comment, above main:
//   1. Write one bill line
//   2. Write the day sheet
//   3. Add a day to the log

#include <iostream>
#include <string>
#include <vector>

// One bill on the sheet, given whole. Every task uses it as it is.
struct Bill {
    std::string item;
    int minutes = 0;
    double price = 0;
};

// Task 1: Write one bill line
// Write a function called writeBillLine that takes a stream as a reference to a std::ostream, an
// item as a reference to a const std::string, minutes as an int and a price as a double, and gives
// nothing back. It writes one line to the stream: the item on the left of 16 columns, the minutes
// on the right of 5, the price on the right of 9 with exactly 2 decimals, then a line end. An item
// longer than 16 characters is written whole. Like this, for "mantel clock", 75 and 78.5:
//   mantel clock       75    78.50

// Task 2: Write the day sheet
// Write a function called writeSheet that takes a path as a reference to a const std::string and
// the bills as a reference to a const std::vector<Bill>, and gives back a bool. It writes a new
// file at that path, in place of anything that was there: one bill line for each bill, in order,
// then one more for "Total", with all the minutes and all the prices added up. It gives back false
// when the file cannot be opened for writing, and true otherwise.

// Task 3: Add a day to the log
// Write a function called addToLog that takes a path as a reference to a const std::string and an
// entry as a reference to a const std::string, and gives back an int. It adds the entry as one
// line at the end of the file at that path, keeping what is there, and makes the file when it is
// not there yet. Then it gives back how many lines the file holds. When the file cannot be opened,
// it gives back -1.

int main() {
    std::cout << "Ambrose's day sheet\n";

    std::vector<Bill> today = {
        {"mantel clock", 75, 78.5},
        {"pocket watch", 30, 30.25},
    };

    // Try each task here once you have written it: write a bill line of today to std::cout, write
    // the sheet to sheet.txt, and add "Monday: 2 repairs" to log.txt. Run it twice and look at both
    // files. Check calls your functions with streams and files of its own.
    std::cout << today.size() << " bills today\n";

    return 0;
}
