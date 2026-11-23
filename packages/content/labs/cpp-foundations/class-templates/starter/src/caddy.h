// caddy.h: the class template Caddy, a caddy that holds up to a set number of things of any one
// type. Every file that uses a Caddy includes this header. Tasks 1 and 2 are in this file, Task 3
// is in main.cpp.
#ifndef CADDY_H
#define CADDY_H

#include <stdexcept>
#include <string>
#include <vector>

// Task 1: Write the class template
// Write a class template called Caddy, with one type T. It keeps its items in a private
// std::vector<T> called items and its limit in a private int called limit. Its public parts are:
// - a constructor that takes the limit as an int, and starts with no items;
// - add, which takes an item as a reference to a const T. When the caddy holds fewer items than
//   its limit, it puts a copy of the item at the end and gives back true; when it is full, it
//   changes nothing and gives back false;
// - count, which changes nothing and gives back how many items it holds, as an int;
// - the declaration of at, which takes a place as an int, changes nothing and gives back a
//   reference to a const T. Its body is Task 2's, below the class.
// The bodies of the constructor, add and count go inside the class. A type T needs to offer only
// copies for a Caddy to work.

// Task 2: Reach an item by its place, below the class
// Below the class, in this file, write the body of at: it gives back the item at that place,
// counted from 0. When there is no item at that place, it throws a std::out_of_range.

#endif
