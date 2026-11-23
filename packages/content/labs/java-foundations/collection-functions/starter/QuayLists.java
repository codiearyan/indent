// Ossian's lists at the quay. Run this file in the terminal with: java QuayLists.java
//
// 1. Tidy the waiting list where it is
// 2. Add up the seats booked on each boat
// 3. Group the passengers by boat

import java.util.*;
import java.util.function.*;

public class QuayLists {
    public static void main(String[] args) {
        // main is yours: try your types here, and take the // off a group of lines once what
        // it uses is written.
        List<String> waiting = new ArrayList<>(List.of("  Torquil", "", "peigi ", "Murdo", "   ", "ishbel"));
        // Tidy.names(waiting);
        // System.out.println(waiting);

        List<Booking> bookings = List.of(
            new Booking("Ishbel", "Gannet", 2),
            new Booking("Torquil", "Linnet", 4),
            new Booking("Peigi", "Gannet", 1),
            new Booking("Murdo", "Gannet", 3));
        // System.out.println(Seats.perBoat(bookings));
        // System.out.println(Groups.passengersByBoat(bookings));
    }
}

// One booking: who booked, on which boat, and how many seats. Use it as it is.
record Booking(String passenger, String boat, int seats) {
}

// Task 1: Tidy the waiting list where it is
// Write a class Tidy with a method static void names(List<String> names). It changes the list
// it is handed: it takes off every name that is blank (empty, or only spaces), takes the spaces
// off both ends of every other name, then sorts the list in alphabetical order, taking no notice
// of capital letters.

// Task 2: Add up the seats booked on each boat
// Write a class Seats with a method static Map<String, Integer> perBoat(List<Booking>
// bookings). It gives back a new map from each boat to the seats booked on it, every booking
// of that boat added up. bookings stays as it is.

// Task 3: Group the passengers by boat
// Write a class Groups with a method static Map<String, List<String>> passengersByBoat(
// List<Booking> bookings). It gives back a new map from each boat to the passengers who booked
// it, in the order they booked. bookings stays as it is.
