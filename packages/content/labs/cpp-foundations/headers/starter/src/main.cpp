// The workshop's program, all in one file so far. Build and run it with:
//   g++ -std=c++17 -Wall src/main.cpp src/repair.cpp -o workshop && ./workshop
//
// In this issue the repair moves out of this file: its struct and the first lines of its
// functions into src/repair.h, the bodies of its functions into src/repair.cpp. main stays here.
// The tasks are in those two files.

#include <iostream>
#include <string>

#include "repair.h"

struct Repair {
    int ticket = 0;
    std::string item;
    int minutes = 0;
};

std::string minutesText(int minutes) {
    if (minutes < 60) {
        return std::to_string(minutes) + " min";
    }
    return std::to_string(minutes / 60) + " h " + std::to_string(minutes % 60) + " min";
}

int main() {
    std::cout << "Tolliver Clockworks\n";

    Repair clock;
    clock.ticket = 3101;
    clock.item = "mantel clock";
    clock.minutes = 75;
    std::cout << clock.ticket << " " << clock.item << ", " << minutesText(clock.minutes) << "\n";

    return 0;
}
