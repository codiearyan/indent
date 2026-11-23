// repair.h: one repair of the day, and the function that reads one from a line of the day's file.
// Given whole: nothing in it needs to change in this issue.
#ifndef REPAIR_H
#define REPAIR_H

#include <string>

struct Repair {
    int ticket = 0;
    std::string item;
    int minutes = 0;
    double parts = 0;
};

// Written in repair.cpp: fills in the repair from a line of four fields and gives back true, or
// gives back false and leaves it as it was.
bool parseRepair(const std::string& line, Repair& repair);

#endif
