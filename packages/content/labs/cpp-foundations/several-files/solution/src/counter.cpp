// counter.cpp: what Dorrit says at the counter.
#include "repair.h"

// Task 2: Write the pickup line
// Write pickupLine, as repair.h declares it. It gives back "Ticket ", the ticket, ": ", the item
// and " is ready". Like this:
//   Ticket 3101: mantel clock is ready
std::string pickupLine(const Repair& repair) {
    return "Ticket " + std::to_string(repair.ticket) + ": " + repair.item + " is ready";
}
