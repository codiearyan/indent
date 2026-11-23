#!/bin/sh
# build.sh: builds the day book step by step, one object file for each .cpp file, then the
# program. Run it with: sh build.sh
set -e
cd "$(dirname "$0")"
mkdir -p build
FLAGS="-std=c++17 -Wall -Wextra"

# The first step is written for you: repair.cpp compiled on its own into build/repair.o.
g++ $FLAGS -c src/repair.cpp -o build/repair.o

# Task 4: Compile the other files, then link
# Below, write one line like the one above for each of the other .cpp files in src, each into
# its own .o file in build. Then write the line that links every .o file into the program
# daybook, in the workspace folder.
g++ $FLAGS -c src/daybook.cpp -o build/daybook.o
g++ $FLAGS -c src/report.cpp -o build/report.o
g++ $FLAGS -c src/main.cpp -o build/main.o
g++ build/repair.o build/daybook.o build/report.o build/main.o -o daybook

echo "build.sh is done"
