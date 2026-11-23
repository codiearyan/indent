// The Gannet's boarding list. Run this file in the terminal with: java BoardingList.java
//
// 1. Copy the booked list, and add a late name
// 2. Free a seat by its number
// 3. Void tickets while walking the list

import java.util.*;

public class BoardingList {
    public static void main(String[] args) {
        // main is yours: try your classes here, and take the // off a group of lines once what
        // it uses is written.
        List<String> booked = List.of("Ishbel", "Torquil", "Seonag");
        // List<String> boarding = Boarding.withLate(booked, "Innes");
        // boarding.add("Murdo");
        // System.out.println("Booked: " + booked);
        // System.out.println("Boarding: " + boarding);

        List<Integer> taken = new ArrayList<>(List.of(3, 6, 1, 9));
        // int at = Seats.free(taken, 1);
        // System.out.println("Seat 1 was at position " + at + ", taken now: " + taken);

        List<Integer> sold = new ArrayList<>(List.of(1201, 1202, 1203, 1204));
        // int voided = Tickets.voidAll(sold, List.of(1202, 1203));
        // System.out.println(voided + " voided, sold now: " + sold);
    }
}

// Task 1: Copy the booked list, and add a late name
// Write a class Boarding with a method static List<String> withLate(List<String> booked,
// String late). It gives back a new list: everyone booked, in order, then late at the end,
// unless late is booked already. The caller can add to the list it gives back. booked stays
// as it is, and it may be a list made with List.of.

// Task 2: Free a seat by its number
// Write a class Seats with a method static int free(List<Integer> taken, int seat). It takes
// the seat number seat off taken, the caller's own list, and gives back the position the seat
// was at. When the seat is not taken it changes nothing and gives back -1. A seat is on the
// list once at most.

// Task 3: Void tickets while walking the list
// Write a class Tickets with a method static int voidAll(List<Integer> sold,
// List<Integer> voided). It takes every ticket number in voided off sold, the caller's own
// list, keeps the others in their order, and gives back how many it took off. voided stays
// as it is.
