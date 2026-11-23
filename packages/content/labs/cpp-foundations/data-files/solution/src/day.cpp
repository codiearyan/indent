// Ambrose's end of day: the day's tickets read from a file into repairs, bad lines refused with
// their line number, and a report of the totals written back. Build it and run it from the
// workspace folder with:
//   g++ -std=c++17 -Wall src/day.cpp -o day && ./day
//
// Your tasks, each under its own // Task comment, above main:
//   1. Read one repair from a line
//   2. Read every repair of the day
//   3. Write the day's report
//   4. Run the day from file to file

#include <fstream>
#include <iomanip>
#include <iostream>
#include <optional>
#include <sstream>
#include <string>
#include <vector>

// One repair of the day, given whole. Every task uses it as it is.
struct Repair {
    int ticket = 0;
    std::string item;
    int minutes = 0;
    double parts = 0;
};

// The tools of last issue, given whole: use them as they are.
std::string trim(const std::string& text) {
    const std::string blanks = " \t\r";
    std::size_t first = text.find_first_not_of(blanks);
    if (first == std::string::npos) {
        return "";
    }
    std::size_t last = text.find_last_not_of(blanks);
    return text.substr(first, last - first + 1);
}

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

std::optional<int> toWhole(const std::string& text) {
    std::istringstream in(text);
    int number = 0;
    char extra = 0;
    if (!(in >> number) || in >> extra) {
        return std::nullopt;
    }
    return number;
}

// The same as toWhole, for an amount with decimals, such as 18.50.
std::optional<double> toAmount(const std::string& text) {
    std::istringstream in(text);
    double amount = 0;
    char extra = 0;
    if (!(in >> amount) || in >> extra) {
        return std::nullopt;
    }
    return amount;
}

// Task 1: Read one repair from a line
// Write a function called parseRepair that takes a line as a reference to a const std::string and
// a repair as a reference to a Repair, and gives back a bool. The line holds four fields with
// commas between them: the ticket, the item, the minutes and the parts. Blanks around a field do
// not count. When the line has exactly four fields, the ticket and the minutes are whole numbers,
// the item is not empty and the parts are an amount, it fills in the repair and gives back true.
// Otherwise it gives back false and leaves the repair as it was.
bool parseRepair(const std::string& line, Repair& repair) {
    std::vector<std::string> fields = splitAt(line, ',');
    if (fields.size() != 4) {
        return false;
    }
    std::optional<int> ticket = toWhole(trim(fields[0]));
    std::string item = trim(fields[1]);
    std::optional<int> minutes = toWhole(trim(fields[2]));
    std::optional<double> parts = toAmount(trim(fields[3]));
    if (!ticket || item.empty() || !minutes || !parts) {
        return false;
    }
    repair.ticket = *ticket;
    repair.item = item;
    repair.minutes = *minutes;
    repair.parts = *parts;
    return true;
}

// Task 2: Read every repair of the day
// Write a function called readRepairs that takes a stream as a reference to a std::istream and the
// refused lines as a reference to a std::vector<int>, and gives back a std::vector<Repair>. The
// stream's first line is a heading, which it skips. Every other line that parseRepair takes goes
// into the repairs, in order. A line that is empty, or only blanks, is skipped. Any other line is
// refused: its line number is added to the refused lines, counting the heading as line 1.
std::vector<Repair> readRepairs(std::istream& in, std::vector<int>& refused) {
    std::vector<Repair> repairs;
    std::string line;
    int number = 0;
    while (std::getline(in, line)) {
        number++;
        if (number == 1 || trim(line).empty()) {
            continue;
        }
        Repair repair;
        if (parseRepair(line, repair)) {
            repairs.push_back(repair);
        } else {
            refused.push_back(number);
        }
    }
    return repairs;
}

// Task 3: Write the day's report
// Write a function called writeReport that takes a stream as a reference to a std::ostream, the
// repairs as a reference to a const std::vector<Repair> and the refused lines as a reference to a
// const std::vector<int>, and gives nothing back. It writes four lines, each with its line end:
//   Repairs: 3
//   Minutes: 150
//   Parts: 37.50
//   Refused: 4, 7
// with how many repairs there are, all their minutes, all their parts with exactly 2 decimals,
// and the refused line numbers in order with ", " between them, or "none" when there are none.
void writeReport(std::ostream& out, const std::vector<Repair>& repairs, const std::vector<int>& refused) {
    int minutes = 0;
    double parts = 0;
    for (const Repair& repair : repairs) {
        minutes += repair.minutes;
        parts += repair.parts;
    }
    out << "Repairs: " << repairs.size() << '\n';
    out << "Minutes: " << minutes << '\n';
    out << "Parts: " << std::fixed << std::setprecision(2) << parts << '\n';
    out << "Refused: ";
    if (refused.empty()) {
        out << "none";
    }
    for (std::size_t i = 0; i < refused.size(); i++) {
        if (i > 0) {
            out << ", ";
        }
        out << refused[i];
    }
    out << '\n';
}

// Task 4: Run the day from file to file
// Write a function called runDay that takes the path of the tickets and the path of the report,
// each as a reference to a const std::string, and gives back a bool. When the tickets do not open,
// it gives back false and writes no report. Otherwise it reads the repairs with readRepairs, writes
// the report with writeReport to a new file at the report's path, and gives back true.
bool runDay(const std::string& ticketsPath, const std::string& reportPath) {
    std::ifstream tickets(ticketsPath);
    if (!tickets) {
        return false;
    }
    std::vector<int> refused;
    std::vector<Repair> repairs = readRepairs(tickets, refused);
    std::ofstream report(reportPath);
    writeReport(report, repairs, refused);
    return true;
}

int main() {
    std::cout << "Ambrose's end of day\n";

    Repair first;
    if (parseRepair("3101, mantel clock ,75,18.50", first)) {
        std::cout << "Ticket " << first.ticket << ": " << first.item << "\n";
    }

    std::ifstream tickets("data/tickets.csv");
    std::vector<int> refused;
    std::vector<Repair> repairs = readRepairs(tickets, refused);
    writeReport(std::cout, repairs, refused);

    if (runDay("data/tickets.csv", "report.txt")) {
        std::cout << "report.txt written\n";
    }

    return 0;
}
