// repair.h: the class Repair, which every .cpp file that works with a repair includes.
#ifndef REPAIR_H
#define REPAIR_H

// Task 1: Move the class here
// Move the class Repair out of main.cpp into this file, inside an include guard, with the
// #include this file needs for std::string. Keep its members and the first line of each of its
// functions, with a semicolon in place of the body: the bodies go to repair.cpp in Task 2. The
// guard's first two lines go at the top of the file and its #endif on the last line.
#include <string>

class Repair {
public:
    Repair(int number, const std::string& name);

    int getTicket() const;
    const std::string& getItem() const;
    int getMinutes() const;

    bool addMinutes(int extra);

private:
    int ticket;
    std::string item;
    int minutes;
};

#endif
