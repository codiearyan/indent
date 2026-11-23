// Dorrit's counter screen: it shows repairs it must never change, numbers every new ticket
// itself, and knows the bench's limit for a day. Build and run it with:
//   g++ -std=c++17 -Wall src/screen.cpp -o screen && ./screen
//
// Your tasks, each written inside the class under its own // Task comment, with the labels it
// asks for, public: or private:.
//   1. Read a repair that must not change
//   2. Log time, never past the day's limit
//   3. Number every ticket

#include <iostream>
#include <string>

class Repair {
    // Task 1: Read a repair that must not change
    // Under private:, three members: ticket, an int that starts at 0; item, a std::string; and
    // minutes, an int that starts at 0. Under public:, three member functions marked const, which
    // take nothing: getTicket gives back the ticket as an int, getItem gives back the item as a
    // reference to a const std::string, and getMinutes gives back the minutes as an int.

    // Task 2: Log time, never past the day's limit
    // Under public:, a static const int called dayLimit, set to 480: the most minutes a repair can
    // have in a day. Then a member function called addMinutes that takes the extra minutes as an
    // int and gives back a bool. It adds them and gives back true when they are at least 1 and
    // the repair's minutes with them stay within dayLimit. Anything else changes nothing and
    // gives back false.

    // Task 3: Number every ticket
    // Under private:, a static int called issued: the last ticket number given out. Below the
    // class, define it with the value 3100. Under public:, a constructor marked explicit that
    // takes the item as a reference to a const std::string and gives the repair the next ticket
    // number and that item, and a static member function called lastTicket that takes nothing
    // and gives back the last ticket number given out, as an int.
};

int main() {
    std::cout << "Dorrit's screen\n";

    // Try each part here once you have written it: make repairs, read them through a const
    // reference and print what you get. Check makes repairs of its own, with values of its own.

    return 0;
}
