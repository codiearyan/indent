// Dorrit's intake: every repair is whole from the moment it is made, with its ticket, its item
// and no time at the bench yet. Build and run it with:
//   g++ -std=c++17 -Wall src/intake.cpp -o intake && ./intake
//
// Your tasks, each written inside the class under its own // Task comment, with the labels it
// asks for, public: or private:.
//   1. Take in a repair whole
//   2. Give the rack an empty repair
//   3. Take in a repair by its ticket alone

#include <iostream>
#include <string>
#include <vector>

class Repair {
    // Task 1: Take in a repair whole
    // Under private:, three members, which need no starting values: ticket, a const int; item, a
    // std::string; and minutes, an int. Under public:, getTicket, getItem and getMinutes,
    // which take nothing and give back each one, as an int, a std::string and an int. Then a
    // constructor that takes the ticket as an int and the item as a reference to a const
    // std::string, and gives the repair that ticket, that item and 0 minutes, in a member
    // initialiser list written in the order the members are declared.

    // Task 2: Give the rack an empty repair
    // Under public:, a constructor that takes nothing and makes an empty repair: ticket 0, the
    // item "none" and 0 minutes, given in its member initialiser list.

    // Task 3: Take in a repair by its ticket alone
    // Under public:, a constructor marked explicit that takes only the ticket, as an int, for a
    // clock that comes in the post: that ticket, the item "in the post" and 0 minutes.
};

int main() {
    std::cout << "Dorrit's intake\n";

    // Try each constructor here once you have written it: make repairs with it and print what
    // their functions give back. Check makes repairs of its own, with values of its own.

    return 0;
}
