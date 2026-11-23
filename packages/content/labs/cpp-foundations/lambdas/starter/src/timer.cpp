// Dorrit's counter: hours from minutes, quotes that keep their word, and a timer that logs
// minutes on a repair. Build and run it with:
//   g++ -std=c++17 -Wall src/timer.cpp -o timer && ./timer
//
// Your tasks, each under its own // Task comment, above main:
//   1. Turn minutes into hours with a lambda
//   2. Make a quote that keeps its word
//   3. Make a timer that logs on the repair

#include <iostream>
#include <string>

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

// Task 1: Turn minutes into hours with a lambda
// Make a variable called hoursOf, here above main, that holds a lambda. The lambda takes minutes
// as an int and gives back the hours they make as a double: 90 minutes are 1.5 hours.

// Task 2: Make a quote that keeps its word
// Write a function called quoteFor that takes a repair as a reference to a const Repair and gives
// back a lambda, with auto in front of its name for the lambda's type. The lambda takes an hourly
// rate as a double and gives back the price of the repair's minutes at that rate, as a double. A
// quote keeps its word: it prices the minutes the repair had when quoteFor made it, whatever
// happens to the repair afterwards, even once the repair has ended.

// Task 3: Make a timer that logs on the repair
// Write a function called logInto that takes a repair as a reference to a Repair and gives back a
// lambda, with auto in front of its name. The lambda takes minutes as an int, adds them to that
// same repair with addMinutes, and gives back the repair's minutes after that, as an int. The
// repair is the caller's own: what the lambda logs, the caller sees, and what the caller logs
// itself, the lambda sees too.

int main() {
    std::cout << "Dorrit's counter\n";

    Repair clock(3101, "mantel clock");
    clock.addMinutes(90);

    // Try each task here once you have written it: the hours of 90 minutes, a quote for clock at
    // 40 an hour before and after Kasimir logs 30 more minutes on it, and a timer for clock. Check
    // calls your code with repairs of its own.
    std::cout << "Repair " << clock.getTicket() << " has " << clock.getMinutes() << " minutes\n";

    return 0;
}
