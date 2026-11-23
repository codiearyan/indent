// Ambrose's day sheet: the day's bills written to a file whose columns line up, and a log that
// grows by one line a day. Build it and run it from the workspace folder with:
//   g++ -std=c++17 -Wall src/sheet.cpp -o sheet && ./sheet
//
// Your tasks, each under its own // Task comment, above main:
//   1. Write one bill line
//   2. Write the day sheet
//   3. Add a day to the log

#include <fstream>
#include <iomanip>
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
void writeBillLine(std::ostream& out, const std::string& item, int minutes, double price) {
    out << std::left << std::setw(16) << item;
    out << std::right << std::setw(5) << minutes;
    out << std::fixed << std::setprecision(2) << std::setw(9) << price << '\n';
}

// Task 2: Write the day sheet
// Write a function called writeSheet that takes a path as a reference to a const std::string and
// the bills as a reference to a const std::vector<Bill>, and gives back a bool. It writes a new
// file at that path, in place of anything that was there: one bill line for each bill, in order,
// then one more for "Total", with all the minutes and all the prices added up. It gives back false
// when the file cannot be opened for writing, and true otherwise.
bool writeSheet(const std::string& path, const std::vector<Bill>& bills) {
    std::ofstream file(path);
    if (!file) {
        return false;
    }
    int minutes = 0;
    double price = 0;
    for (const Bill& bill : bills) {
        writeBillLine(file, bill.item, bill.minutes, bill.price);
        minutes += bill.minutes;
        price += bill.price;
    }
    writeBillLine(file, "Total", minutes, price);
    return true;
}

// Task 3: Add a day to the log
// Write a function called addToLog that takes a path as a reference to a const std::string and an
// entry as a reference to a const std::string, and gives back an int. It adds the entry as one
// line at the end of the file at that path, keeping what is there, and makes the file when it is
// not there yet. Then it gives back how many lines the file holds. When the file cannot be opened,
// it gives back -1.
int addToLog(const std::string& path, const std::string& entry) {
    {
        std::ofstream log(path, std::ios::app);
        if (!log) {
            return -1;
        }
        log << entry << '\n';
    }
    std::ifstream again(path);
    int count = 0;
    std::string line;
    while (std::getline(again, line)) {
        count++;
    }
    return count;
}

int main() {
    std::cout << "Ambrose's day sheet\n";

    std::vector<Bill> today = {
        {"mantel clock", 75, 78.5},
        {"pocket watch", 30, 30.25},
    };

    writeBillLine(std::cout, today[0].item, today[0].minutes, today[0].price);
    if (writeSheet("sheet.txt", today)) {
        std::cout << "sheet.txt written\n";
    }
    std::cout << "log.txt holds " << addToLog("log.txt", "Monday: 2 repairs") << " lines\n";

    return 0;
}
