// daybook.h: the day book, which keeps the day's repairs. Given whole: its member functions are
// written in daybook.cpp.
#ifndef DAYBOOK_H
#define DAYBOOK_H

#include <istream>
#include <vector>

#include "repair.h"

class DayBook {
public:
    int load(std::istream& in);
    const Repair* longest() const;
    int count() const;
    int totalMinutes() const;
    const std::vector<Repair>& all() const;

private:
    std::vector<Repair> repairs;
};

#endif
