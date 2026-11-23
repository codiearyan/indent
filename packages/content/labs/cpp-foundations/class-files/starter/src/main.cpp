// The workshop's program. Build and run it with:
//   g++ -std=c++17 -Wall src/main.cpp src/repair.cpp -o workshop && ./workshop
//
// In this issue the class Repair moves out of this file: the class itself, with only the first
// line of each of its functions, into src/repair.h, and the bodies of its functions into
// src/repair.cpp. Task 1 is in repair.h, Task 2 in repair.cpp and Task 3 here.

#include <iostream>
#include <string>

#include "repair.h"

class Repair {
public:
    Repair(int number, const std::string& name) : ticket(number), item(name), minutes(0) {}

    int getTicket() const {
        return ticket;
    }

    const std::string& getItem() const {
        return item;
    }

    int getMinutes() const {
        return minutes;
    }

    bool addMinutes(int extra) {
        if (extra < 1 || extra > 480) {
            return false;
        }
        minutes += extra;
        return true;
    }

private:
    int ticket;
    std::string item;
    int minutes;
};

// Task 3: Write the bench line
// Write a function called benchLine that takes a repair as a reference to a const Repair and
// gives back its line for the bench as a std::string: the ticket, a space, the item, ", " and the
// minutes, then " min". Like this:
//   3101 mantel clock, 75 min

int main() {
    std::cout << "Tolliver Clockworks\n";

    Repair clock(3101, "mantel clock");
    clock.addMinutes(75);
    std::cout << clock.getTicket() << " " << clock.getItem() << ", " << clock.getMinutes() << " min\n";

    return 0;
}
