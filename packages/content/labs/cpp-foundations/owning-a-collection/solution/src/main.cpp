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
    Bench bench;
    bench.add(clock);
    bench.add(watch);
    if (!bench.add(clock)) {
        std::cout << "Ticket 3101 is on the bench already\n";
    }
    std::cout << bench.all().size() << " repairs, " << bench.totalMinutes() << " min in all\n";
    std::cout << "3104 is the " << bench.find(3104).getItem() << "\n";

    bench.remove(3101);
    std::cout << "After 3101 went home: " << bench.all().size() << " repair\n";

    return 0;
}
