// The type of an order, shared by packing.ts and shipping.ts. This file holds only types, so
// there is nothing in it to run. Check the types of all three files with: npm run types
//
// Packing and shipping each kept their own copy of the type of an order, and the copies drifted
// apart. From now on the type lives in one file, order.ts, and the other two import it.
//
// 1. One type for an order, written whole (order.ts)
// 2. Packing imports it (packing.ts)
// 3. Shipping imports it too (shipping.ts)

// Task 1: One type for an order, written whole
// Write a type alias called Order, with export in front, for an order as the order form sends
// it: id (text), blend (text), tins (a number), grams (a number, the weight of the whole order)
// and express (true or false). When it is right, npm run types refuses no line of this file.
