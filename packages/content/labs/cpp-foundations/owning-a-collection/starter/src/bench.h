// bench.h: a repair, and Kasimir's bench, which keeps the repairs on it behind functions of its
// own. Every .cpp file that works with the bench includes this file.
#ifndef BENCH_H
#define BENCH_H

#include <string>
#include <vector>

// The repair, written whole. Nothing in it changes in this issue.
class Repair {
public:
    Repair() : ticket(0), item("none"), minutes(0) {}
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

class Bench {
    // Task 1: Give the bench its repairs
    // Under private:, a std::vector<Repair> called repairs. Under public:, declare add, which
    // takes a repair as a reference to a const Repair and gives back a bool, and all, a const
    // member function that takes nothing and gives back a copy of the repairs, as a
    // std::vector<Repair>. Their bodies go in bench.cpp.

    // Task 2: Find a repair by its ticket
    // Under public:, declare find, a const member function that takes a ticket as an int and
    // gives back a Repair. Its body goes in bench.cpp.

    // Task 3: Total the bench's minutes
    // Under public:, declare totalMinutes, a const member function that takes nothing and gives
    // back an int. Its body goes in bench.cpp.

    // Task 4: Take a repair off the bench
    // Under public:, declare remove, which takes a ticket as an int and gives back a bool. Its
    // body goes in bench.cpp.
};

#endif
