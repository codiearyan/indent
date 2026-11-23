// Where is my clock? Each repair moves through four states, from the day it comes in to the day
// it is collected. Here each state gets a name of its own, instead of a number on the slip. Build
// and run it with:
//   g++ -std=c++17 -Wall src/status.cpp -o status && ./status
//
// Your tasks, each written under its own // Task comment, above main:
//   1. Name the states of a repair
//   2. Say whether a repair can be collected
//   3. Write a state in words for the slip
//   4. Move a repair on to its next state

#include <iostream>
#include <string>

// Task 1: Name the states of a repair
// Write an enum class called Status with four values: Waiting, OnBench, Ready and Collected.

// Task 2: Say whether a repair can be collected
// Write a function called canCollect that takes a state as a Status and gives back true when it
// is Ready, and false for every other state.

// Task 3: Write a state in words for the slip
// Write a function called statusText that takes a state as a Status and gives back its words as
// a std::string, chosen with a switch that has a case for each of the four states and no
// default:
//   Waiting    waiting for the bench
//   OnBench    on the bench
//   Ready      ready to collect
//   Collected  collected

// Task 4: Move a repair on to its next state
// Write a function called nextStatus that takes a state as a Status and gives back the state
// that comes after it: OnBench after Waiting, Ready after OnBench, Collected after Ready.
// Collected is the last state, so after Collected it is still Collected.

int main() {
    std::cout << "Where is my clock?\n";

    // Today the slip says 2, and nobody is sure whether 2 means on the bench or ready.
    int state = 2;
    std::cout << "Ticket 3101 is in state " << state << "\n";

    // Try each function here once you have written it. Check calls your functions with states of
    // its own.

    return 0;
}
