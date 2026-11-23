// The fitting bench: Kasimir fits new parts to a repair, and some parts turn out not to fit.
// Build and run it with:
//   g++ -std=c++17 -Wall src/fitting.cpp -o fitting && ./fitting
//
// Your tasks, each under its own // Task comment, above main:
//   1. Open a repair with its parts, and leave nothing behind
//   2. Borrow a tool, and always put it back
//   3. Fit parts with the loupe

#include <iostream>
#include <map>
#include <memory>
#include <stdexcept>
#include <string>
#include <vector>

// A repair on the bench, given whole. Every task uses it as it is. Its destructor prints a line,
// so you can see in the terminal when each repair ends.
class Repair {
private:
    int ticket;
    std::string item;
    int minutes = 0;

public:
    Repair(int number, const std::string& name) : ticket(number), item(name) {}
    ~Repair() { std::cout << "Repair " << ticket << " ends\n"; }

    int getTicket() const { return ticket; }
    const std::string& getItem() const { return item; }
    int getMinutes() const { return minutes; }
    void addMinutes(int extra) { minutes += extra; }
};

// Fits one part to a repair, given whole, and logs 15 minutes on it. It throws std::runtime_error
// when the part does not fit: here, a part whose name starts with "bent". Every task uses it as it
// is.
void fitPart(Repair& repair, const std::string& part) {
    if (part.substr(0, 4) == "bent") {
        throw std::runtime_error("the " + part + " does not fit repair " + std::to_string(repair.getTicket()));
    }
    repair.addMinutes(15);
    std::cout << "Fitted the " << part << " to repair " << repair.getTicket() << "\n";
}

// Task 1: Open a repair with its parts, and leave nothing behind
// openWithParts makes a new repair with the ticket and item, fits each part to it with fitPart in
// order, and gives back the owner of the repair. When a part does not fit, fitPart throws and the
// exception goes on to the caller. Then no repair may be left behind, and today one is: each time
// a part does not fit, a repair stays in memory that nothing can ever delete. Mend openWithParts.
std::unique_ptr<Repair> openWithParts(int ticket, const std::string& item, const std::vector<std::string>& parts) {
    std::unique_ptr<Repair> repair = std::make_unique<Repair>(ticket, item);
    for (const std::string& part : parts) {
        fitPart(*repair, part);
    }
    return repair;
}

// Task 2: Borrow a tool, and always put it back
// Write a class called Borrowed. Its constructor takes the drawer as a reference to a
// std::map<std::string, int>, which says how many of each tool are in it, and a tool's name as a
// reference to a const std::string. It takes one of that tool out of the drawer. When the drawer
// has none of it, the constructor throws a std::runtime_error whose what() names the tool, and
// changes nothing. Its destructor puts the tool back. A Borrowed cannot be copied: a copy would put
// the tool back a second time.
class Borrowed {
private:
    std::map<std::string, int>& drawer;
    std::string tool;

public:
    Borrowed(std::map<std::string, int>& from, const std::string& name) : drawer(from), tool(name) {
        if (drawer.count(tool) == 0 || drawer.at(tool) <= 0) {
            throw std::runtime_error("there is no " + tool + " left in the drawer");
        }
        drawer.at(tool) = drawer.at(tool) - 1;
    }

    ~Borrowed() { drawer[tool] = drawer[tool] + 1; }

    Borrowed(const Borrowed&) = delete;
    Borrowed& operator=(const Borrowed&) = delete;
};

// Task 3: Fit parts with the loupe
// Write a function called fitWithLoupe that takes the drawer as a reference to a
// std::map<std::string, int>, a repair as a reference to a Repair, and the parts as a reference to
// a const std::vector<std::string>, and gives back an int. It borrows the "loupe" from the drawer
// with a Borrowed, holds it while it fits each part to the repair with fitPart, in order, and gives
// back how many parts it fitted. When a part does not fit, or there is no loupe, the exception goes
// on to the caller, and the loupe is back in the drawer whatever happened.
int fitWithLoupe(std::map<std::string, int>& drawer, Repair& repair, const std::vector<std::string>& parts) {
    Borrowed loupe(drawer, "loupe");
    int fitted = 0;
    for (const std::string& part : parts) {
        fitPart(repair, part);
        fitted = fitted + 1;
    }
    return fitted;
}

int main() {
    std::cout << "The fitting bench\n";

    // Try each task here once you have written it: open a repair with {"mainspring", "crystal"},
    // and one with {"mainspring", "bent hand"} inside a try, and watch which repairs end. Check
    // calls your code with repairs, parts and a drawer of its own.
    std::unique_ptr<Repair> good = openWithParts(4417, "carriage clock", {"mainspring", "crystal"});
    try {
        std::unique_ptr<Repair> bad = openWithParts(5020, "pocket watch", {"mainspring", "bent hand"});
    } catch (const std::runtime_error& error) {
        std::cout << "Not opened: " << error.what() << "\n";
    }

    std::map<std::string, int> drawer = {{"loupe", 1}, {"tweezers", 2}};
    try {
        fitWithLoupe(drawer, *good, {"hand set", "bent pinion"});
    } catch (const std::runtime_error& error) {
        std::cout << "Stopped: " << error.what() << "\n";
    }
    std::cout << "Loupes in the drawer: " << drawer["loupe"] << "\n";

    return 0;
}
