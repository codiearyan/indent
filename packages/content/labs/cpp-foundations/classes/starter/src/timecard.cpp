// Kasimir's time card: a repair whose item and minutes only change through its own functions,
// which keep the bench's rules. Build and run it with:
//   g++ -std=c++17 -Wall src/timecard.cpp -o timecard && ./timecard
//
// Your tasks, each written inside the class under its own // Task comment, with the labels it
// asks for, public: or private:.
//   1. Keep the item behind two functions
//   2. Add bench time by the rule
//   3. Take time off by the rule

#include <iostream>
#include <string>

class Repair {
    // Task 1: Keep the item behind two functions
    // Under private:, a std::string member called item. Under public:, a function called getItem
    // that takes nothing and gives back the item as a std::string, and a function called setItem
    // that takes the new item as a reference to a const std::string, gives nothing back and puts
    // it in the member.

    // Task 2: Add bench time by the rule
    // Under private:, an int member called minutes that starts at 0. Under public:, a function
    // called getMinutes that takes nothing and gives back the minutes as an int, and a function
    // called addMinutes that takes the extra minutes as an int and gives back a bool. It adds
    // them and gives back true when they are from 1 to 480. Anything else changes nothing and
    // gives back false.

    // Task 3: Take time off by the rule
    // Under public:, a function called removeMinutes that takes the minutes to take off as an int
    // and gives back a bool. It takes them off and gives back true when they are at least 1 and
    // no more than the repair has. Anything else changes nothing and gives back false.
};

int main() {
    std::cout << "Kasimir's time card\n";

    // Try each part here once you have written it: make a Repair, call its functions and print
    // what they give back. Check makes repairs of its own, with values of its own.

    return 0;
}
