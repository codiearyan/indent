// The noticeboard by the gangway. Run this file in the terminal with: java Noticeboard.java
//
// 1. Give tickets a natural order
// 2. Put the departures with most seats first
// 3. Sort the tickets, and make the desk's list

import java.util.*;

public class Noticeboard {
    public static void main(String[] args) {
        // main is yours: try your types here, and take the // off a group of lines once what
        // it uses is written.
        // List<Ticket> tickets = new ArrayList<>();
        // tickets.add(new Ticket(9000000417L, "Ishbel"));
        // tickets.add(new Ticket(10000000002L, "Torquil"));
        // tickets.add(new Ticket(9000000417L, "Euan"));
        // Collections.sort(tickets);
        // System.out.println(tickets);

        List<Departure> today = List.of(
            new Departure("Linnet", 13, 4),
            new Departure("Gannet", 9, 12),
            new Departure("Curlew", 15, 0),
            new Departure("Plover", 11, 4));
        // List<Departure> board = new ArrayList<>(today);
        // board.sort(new MostSeatsFirst());
        // System.out.println(board);

        // System.out.println(Board.forDesk(today));
    }
}

// One departure on the board: the boat, the hour it leaves and the seats still free. Use it as
// it is.
record Departure(String boat, int hour, int seatsFree) {
}

// Task 1: Give tickets a natural order
// Write a record Ticket with a long serial and a String passenger, in that order, that
// implements Comparable<Ticket>. Its compareTo puts the smaller serial first, however far apart
// two serials are, and two tickets with the same serial in alphabetical order of their
// passengers, so it gives back 0 only for equal tickets.

// Task 2: Put the departures with most seats first
// Write a class MostSeatsFirst that implements Comparator<Departure>. Its compare puts the
// departure with more seats free first, and of two with the same seats free, the one that
// leaves at the earlier hour. Two departures with the same seats free and the same hour
// compare as 0.

// Task 3: Sort the tickets, and make the desk's list
// Write a class Board with two methods. static void sortTickets(List<Ticket> tickets) sorts the
// caller's own list in the tickets' natural order. static List<Departure> forDesk(
// List<Departure> today) gives back a new list of the departures with at least one seat free,
// most seats first as MostSeatsFirst orders them. today stays as it is.
