// main.cpp: where the program starts. Build both .cpp files into one program and run it:
//   g++ -std=c++17 -Wall src/main.cpp src/bench.cpp -o bench && ./bench
//
// The tasks are in bench.h and bench.cpp.

#include <iostream>

#include "bench.h"

int main() {
    std::cout << "Kasimir's bench\n";

    Repair clock(3101, "mantel clock");
    clock.addMinutes(45);
    Repair watch(3104, "pocket watch");
    watch.addMinutes(20);

    // Try each function of the bench here once it is written: make a Bench, add clock and watch,
    // and print what you get. Check makes benches of its own, with repairs of its own.
    std::cout << clock.getTicket() << " and " << watch.getTicket() << " are waiting\n";

    return 0;
}
