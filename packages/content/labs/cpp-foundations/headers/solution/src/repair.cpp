// repair.cpp: the bodies of the functions that repair.h declares. It includes repair.h, so the
// compiler checks each body here against its declaration there. Write that #include on the line
// below this comment, above // Task 2.
#include "repair.h"

// Task 2: Write minutesText here
// The body of minutesText, moved from main.cpp.
std::string minutesText(int minutes) {
    if (minutes < 60) {
        return std::to_string(minutes) + " min";
    }
    return std::to_string(minutes / 60) + " h " + std::to_string(minutes % 60) + " min";
}

// Task 3: Write minutesOver here
// minutesOver gives back how many minutes the repair has gone over the quote, or 0 when it is
// within it. With 75 minutes on the repair and a quote of 60, it gives back 15.
int minutesOver(const Repair& repair, int quoted) {
    if (repair.minutes <= quoted) {
        return 0;
    }
    return repair.minutes - quoted;
}
