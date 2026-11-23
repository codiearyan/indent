// repair.h: the repair, and the functions that the other files write. Every .cpp file of the
// program includes it. Nothing in it needs to change in this issue.
#ifndef REPAIR_H
#define REPAIR_H

#include <string>
#include <vector>

struct Repair {
    int ticket = 0;
    std::string item;
    int minutes = 0;
    double parts = 0;
};

// Written in price.cpp: what Ambrose charges for a repair.
double repairPrice(const Repair& repair);

// Written in counter.cpp: what Dorrit says when a repair is ready.
std::string pickupLine(const Repair& repair);

#endif
