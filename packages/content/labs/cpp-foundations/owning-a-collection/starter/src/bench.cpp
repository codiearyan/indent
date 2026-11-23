// bench.cpp: the bodies of Bench's functions, each with Bench:: in front of its name.
#include "bench.h"

// Task 1: Give the bench its repairs
// add puts a copy of the repair on the bench and gives back true, unless a repair with the same
// ticket is on it already: then it changes nothing and gives back false. all gives back a copy
// of the repairs, in the order they were added.

// Task 2: Find a repair by its ticket
// find gives back a copy of the repair with that ticket, or, when none has it, a Repair made
// with no values.

// Task 3: Total the bench's minutes
// totalMinutes gives back the minutes of every repair on the bench added up, worked out from
// the repairs each time it is called.

// Task 4: Take a repair off the bench
// remove takes the repair with that ticket off the bench, keeps the others in their order and
// gives back true. When no repair has that ticket, it changes nothing and gives back false.
