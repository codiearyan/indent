// The look-up at Dorrit's counter: a customer gives a ticket number, Dorrit types it in, and the
// program tells her where the repair is. Build and run it with:
//   g++ -std=c++17 -Wall src/counter.cpp -o counter && ./counter
//
// Your tasks, each a function written under its own // Task comment, above main:
//   1. Read a ticket number from what was typed
//   2. Find a repair, or nothing
//   3. Answer the customer

#include <iostream>
#include <optional>
#include <string>
#include <vector>

struct Repair {
    int ticket;
    std::string item;
    int minutes;
};

// Task 1: Read a ticket number from what was typed
// Write a function called parseTicket that takes the typed text as a reference to a const
// std::string and a ticket as a reference to an int, and gives back a bool. When the text is a
// ticket number, 1 to 6 digits and nothing else, it puts that number in ticket and gives back true.
// Otherwise it gives back false and leaves ticket as it was.
bool parseTicket(const std::string& text, int& ticket) {
    if (text.empty() || text.size() > 6) {
        return false;
    }
    for (char c : text) {
        if (c < '0' || c > '9') {
            return false;
        }
    }
    ticket = std::stoi(text);
    return true;
}

// Task 2: Find a repair, or nothing
// Write a function called findRepair that takes the bench as a reference to a const
// std::vector<Repair> and a ticket as an int, and gives back a std::optional<Repair>: the first
// repair on the bench with that ticket, or nothing when no repair has it.
std::optional<Repair> findRepair(const std::vector<Repair>& bench, int ticket) {
    for (const Repair& repair : bench) {
        if (repair.ticket == ticket) {
            return repair;
        }
    }
    return std::nullopt;
}

// Task 3: Answer the customer
// Write a function called answerFor that takes the bench as a reference to a const
// std::vector<Repair> and the typed text as a reference to a const std::string, and gives back a
// std::string. It reads the ticket with parseTicket, looks the repair up with findRepair, and gives
// back one of three lines, like:
//   Not a ticket number: 12abc
//   No repair with ticket 4417
//   Ticket 4417: carriage clock, 95 minutes
// The first shows the typed text after the colon, the others the ticket, the item and the minutes.
std::string answerFor(const std::vector<Repair>& bench, const std::string& typed) {
    int ticket = 0;
    if (!parseTicket(typed, ticket)) {
        return "Not a ticket number: " + typed;
    }
    std::optional<Repair> found = findRepair(bench, ticket);
    if (!found.has_value()) {
        return "No repair with ticket " + std::to_string(ticket);
    }
    return "Ticket " + std::to_string(found->ticket) + ": " + found->item + ", " + std::to_string(found->minutes) + " minutes";
}

int main() {
    std::vector<Repair> bench = {{4417, "carriage clock", 95}, {5020, "pocket watch", 40}, {61, "lantern clock", 210}};
    std::cout << "Dorrit's counter\n";

    // What Dorrit typed today. Try each function here once you have written it, and print what it
    // gives back for each of these. Check calls your functions with values of its own.
    std::vector<std::string> typed = {"4417", "12abc", "", "777"};
    for (const std::string& text : typed) {
        std::cout << answerFor(bench, text) << "\n";
    }

    return 0;
}
