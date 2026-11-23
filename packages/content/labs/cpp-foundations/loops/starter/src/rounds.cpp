// Kasimir's morning round. Build and run it with:
//   g++ -std=c++17 -Wall src/rounds.cpp -o rounds && ./rounds
//
// Your tasks, each under its own // Task comment inside main:
//   1. List the clocks to wind
//   2. Count the strikes
//   3. Add up the serial number
//   4. Fit springs until the box is empty
//
// A program that never stops can be stopped in the terminal with Ctrl+C.

#include <iostream>

int main() {
    // This morning's round. Check tries other values here, so build on these names, not on
    // the values themselves.
    int clocksToWind = 5;
    int fromHour = 1;
    int toHour = 12;
    int serialNumber = 48213;
    int springsInBox = 10;
    int springsPerClock = 3;
    int clocksWaiting = 5;

    std::cout << "Morning round\n";

    // Task 1: List the clocks to wind
    // With a loop, print one line for each clock to wind, numbered from 1 up to clocksToWind:
    //   Wind clock 1
    //   Wind clock 2
    //   ...
    //   Wind clock 5

    // Task 2: Count the strikes
    // A striking clock strikes once at one o'clock, twice at two, and so on. Make an int called
    // strikes: with a loop, add up the strikes of every hour from fromHour to toHour, both
    // included. Print it, like this:
    //   Strikes: 78

    // Task 3: Add up the serial number
    // The maker's check number is the digits of the serial number added up: 4+8+2+1+3. Make an
    // int called digitSum and work it out with a while loop. Print it, like this:
    //   Check number: 18

    // Task 4: Fit springs until the box is empty
    // Make an int called springsLeft, starting at springsInBox. Go through the waiting clocks,
    // numbered from 1 up to clocksWaiting. Each clock takes springsPerClock springs: take them
    // from springsLeft and print "Clock 1: fitted". When there are not enough springs left for a
    // clock, print "Out of springs at clock 4" and stop going through the clocks:
    //   Clock 1: fitted
    //   Clock 2: fitted
    //   Clock 3: fitted
    //   Out of springs at clock 4

    return 0;
}
