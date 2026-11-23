// repair.cpp: the bodies of Repair's functions. It includes repair.h, so the compiler checks each
// body here against the class there. Write that #include on the line below this comment, above
// // Task 2.
#include "repair.h"

// Task 2: Write the member functions here
// Write the body of the constructor and of every function that repair.h declares, each with
// Repair:: in front of its name, moved from main.cpp.
Repair::Repair(int number, const std::string& name) : ticket(number), item(name), minutes(0) {}

int Repair::getTicket() const {
    return ticket;
}

const std::string& Repair::getItem() const {
    return item;
}

int Repair::getMinutes() const {
    return minutes;
}

bool Repair::addMinutes(int extra) {
    if (extra < 1 || extra > 480) {
        return false;
    }
    minutes += extra;
    return true;
}
